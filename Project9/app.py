import streamlit as st
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re
import string
from sentence_transformers import SentenceTransformer
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from datetime import datetime
from collections import defaultdict
import warnings
warnings.filterwarnings('ignore')

try:
    from transformers import pipeline
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

st.set_page_config(
    page_title="Online Exam Auto-Evaluator with AI Detection",
    page_icon="📋",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
    <style>
    .main-header {
        font-size: 2.5rem;
        color: #1f77b4;
        text-align: center;
        margin-bottom: 2rem;
    }
    .score-card {
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        font-size: 1.5rem;
        font-weight: bold;
    }
    .grade-a { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .grade-b { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; }
    .grade-c { background: linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%); color: white; }
    .grade-d { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; }
    .grade-f { background: linear-gradient(135deg, #30cfd0 0%, #330867 100%); color: white; }
    .ai-high { background-color: #ffcccc; }
    .ai-medium { background-color: #fff0cc; }
    .ai-low { background-color: #ccffcc; }
    </style>
""", unsafe_allow_html=True)

@st.cache_resource
def download_nltk_data():
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt', quiet=True)
    try:
        nltk.data.find('tokenizers/punkt_tab')
    except LookupError:
        nltk.download('punkt_tab', quiet=True)
    try:
        nltk.data.find('corpora/stopwords')
    except LookupError:
        nltk.download('stopwords', quiet=True)

download_nltk_data()

class QuestionExtractor:
    def __init__(self):
        self.question_patterns = [
            r'(?:Question|Q\.?|Ques\.?)\s*(?:#)?\s*(\d+)[:\.\)]?\s*(.+?)(?=(?:Question|Q\.?|Ques\.?)\s*(?:#)?\s*\d+|$)',
            r'(\d+)[:\.\)]\s*(.+?)(?=\d+[:\.\)]|$)',
            r'Q(\d+)[:\.\)]?\s*(.+?)(?=Q\d+|$)',
        ]
    
    def extract_questions(self, text):
        questions = {}
        for pattern in self.question_patterns:
            matches = re.finditer(pattern, text, re.DOTALL | re.IGNORECASE)
            for match in matches:
                q_num = int(match.group(1))
                q_content = match.group(2).strip()
                if q_content and len(q_content) > 10:
                    questions[q_num] = q_content
            if questions:
                break
        
        if not questions:
            sections = text.split('\n\n')
            for i, section in enumerate(sections, 1):
                if section.strip() and len(section.strip()) > 20:
                    questions[i] = section.strip()
        return questions
    
    def parse_answer_key(self, text):
        answer_key = {}
        questions = self.extract_questions(text)
        for q_num, answer in questions.items():
            marks_match = re.search(r'\[(\d+)\s*marks?\]', answer, re.IGNORECASE)
            marks = int(marks_match.group(1)) if marks_match else 10
            clean_answer = re.sub(r'\[\d+\s*marks?\]', '', answer, flags=re.IGNORECASE).strip()
            answer_key[q_num] = {'answer': clean_answer, 'marks': marks}
        return answer_key

class ExamEvaluator:
    def __init__(self, use_bert=True, strictness='balanced'):
        self.use_bert = use_bert
        self.strictness = strictness
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=1000,
            ngram_range=(1, 2),
            stop_words='english',
            min_df=1,
            sublinear_tf=True
        )
        if use_bert:
            self.bert_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.stop_words = set(stopwords.words('english'))
        self.weight_profiles = {
            'strict':   {'keyword': 0.30, 'tfidf': 0.20, 'bert': 0.50},
            'balanced': {'keyword': 0.20, 'tfidf': 0.10, 'bert': 0.70},
            'lenient':  {'keyword': 0.15, 'tfidf': 0.05, 'bert': 0.80},
        }
        self.curve_exponents = {'strict': 1.00, 'balanced': 0.90, 'lenient': 0.80}
        self.attempt_floors = {'strict': 0.00, 'balanced': 0.10, 'lenient': 0.20}

    def preprocess_text(self, text):
        text = text.lower()
        text = ' '.join(text.split())
        text = text.translate(str.maketrans('', '', string.punctuation))
        return text
    
    def extract_keywords(self, text, top_n=10):
        clean_text = self.preprocess_text(text)
        words = word_tokenize(clean_text)
        keywords = [w for w in words if w not in self.stop_words and len(w) > 2]
        word_freq = {}
        for word in keywords:
            word_freq[word] = word_freq.get(word, 0) + 1
        sorted_keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, freq in sorted_keywords[:top_n]]

    def calculate_keyword_match(self, student_answer, model_answer):
        student_keywords = set(self.extract_keywords(student_answer, top_n=20))
        model_keywords   = set(self.extract_keywords(model_answer, top_n=20))
        if not model_keywords:
            return 0.0
        common = student_keywords.intersection(model_keywords)
        return min(len(common) / len(model_keywords), 1.0)
    
    def calculate_tfidf_similarity(self, student_answer, model_answer):
        student_clean = self.preprocess_text(student_answer)
        model_clean   = self.preprocess_text(model_answer)
        try:
            tfidf = self.tfidf_vectorizer.fit_transform([model_clean, student_clean])
            sim = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
            return float(sim)
        except:
            return 0.0
    
    def calculate_bert_similarity(self, student_answer, model_answer):
        if not self.use_bert:
            return 0.0
        emb = self.bert_model.encode([model_answer, student_answer])
        return float(cosine_similarity([emb[0]], [emb[1]])[0][0])

    def _length_bonus(self, student_answer, model_answer):
        student_words = len(student_answer.split())
        model_words   = max(len(model_answer.split()), 1)
        return 0.05 * min(student_words / model_words, 1.0)

    def evaluate_answer(self, student_answer, model_answer, max_marks=10):
        weights = self.weight_profiles[self.strictness]
        curve_exp = self.curve_exponents[self.strictness]
        floor = self.attempt_floors[self.strictness]

        kw = self.calculate_keyword_match(student_answer, model_answer)
        tfidf = self.calculate_tfidf_similarity(student_answer, model_answer)

        if self.use_bert:
            bert = self.calculate_bert_similarity(student_answer, model_answer)
            combined = (weights['keyword'] * kw + weights['tfidf'] * tfidf + weights['bert'] * bert)
        else:
            bert = 0.0
            combined = (0.4 * kw + 0.6 * tfidf)

        combined += self._length_bonus(student_answer, model_answer)
        combined = min(combined, 1.0)

        if len(student_answer.strip()) > 20:
            combined = max(combined, floor)

        combined = combined ** curve_exp
        combined = min(combined, 1.0)

        return {
            'awarded_marks': round(combined * max_marks, 2),
            'max_marks': max_marks,
            'percentage': round(combined * 100, 2),
            'keyword_score': round(kw, 3),
            'tfidf_score': round(tfidf, 3),
            'bert_score': round(bert, 3),
        }

@st.cache_resource
def load_ai_detector():
    if not TRANSFORMERS_AVAILABLE:
        return None
    try:
        detector = pipeline("text-classification", model="roberta-base-openai-detector")
        return detector
    except Exception as e:
        st.warning(f"Could not load AI detection model: {e}. Feature will be disabled.")
        return None

def detect_ai_text(text, detector):
    if not detector or not text or len(text.strip()) < 20:
        return 0.0
    try:
        result = detector(text[:512])
        if result[0]['label'] == 'LABEL_1':
            return result[0]['score']
        else:
            return 1 - result[0]['score']
    except:
        return 0.0

def calculate_grade(percentage):
    if percentage >= 90: return 'A+', 'grade-a'
    elif percentage >= 80: return 'A', 'grade-a'
    elif percentage >= 70: return 'B', 'grade-b'
    elif percentage >= 60: return 'C', 'grade-c'
    elif percentage >= 50: return 'D', 'grade-d'
    else: return 'F', 'grade-f'

if 'strictness' not in st.session_state:
    st.session_state.strictness = 'balanced'

if 'evaluator' not in st.session_state:
    with st.spinner("Loading evaluation models…"):
        st.session_state.evaluator = ExamEvaluator(use_bert=True, strictness=st.session_state.strictness)

if 'question_extractor' not in st.session_state:
    st.session_state.question_extractor = QuestionExtractor()

for key in ('answer_key', 'student_answers', 'evaluation_results', 'ai_results'):
    if key not in st.session_state:
        st.session_state[key] = None

with st.sidebar:
    st.header("⚙️ Settings")
    st.number_input("Total Exam Marks:", min_value=10, max_value=500, value=100, step=10, key="total_marks")
    st.markdown("---")
    st.header("🎚️ Grading Strictness")
    strictness_choice = st.select_slider(
        "Adjust grading strictness:",
        options=['strict', 'balanced', 'lenient'],
        value=st.session_state.strictness,
        help="Strict: exact wording; Balanced: conceptual; Lenient: generous"
    )
    if strictness_choice != st.session_state.strictness:
        st.session_state.strictness = strictness_choice
        st.session_state.evaluator = ExamEvaluator(use_bert=True, strictness=strictness_choice)
        st.success(f"Mode set to **{strictness_choice}**")
    st.info({"strict":"Exact terminology matters","balanced":"Semantic meaning rewarded","lenient":"Conceptual understanding prioritised"}[st.session_state.strictness])
    st.markdown("---")
    st.header("ℹ️ How It Works")
    st.success("""
    1. Paste answer key (with Q numbers)
    2. Paste student answers
    3. Automatic evaluation & scoring
    4. AI detection tab shows potential AI‑generated answers
    5. Statistics tab shows overall performance
    """)
    if st.button("🔄 Reset All"):
        for k in ('answer_key', 'student_answers', 'evaluation_results', 'ai_results'):
            st.session_state[k] = None
        st.rerun()

st.markdown('<h1 class="main-header">📋 Online Exam Auto-Evaluator with AI Detection</h1>', unsafe_allow_html=True)
#st.markdown('<p style="text-align: center;">For online tests only – paste the answer key and student answers.</p>', unsafe_allow_html=True)

tab1, tab2, tab3, tab4, tab5 = st.tabs(["📚 Upload Answer Key", "📝 Upload Student Answers", "📊 View Results", "🔍 AI Detection", "📈 Statistics"])

with tab1:
    st.header("Step 1: Paste the answer key")

    col1, col2 = st.columns([4, 1])

    with col1:
        answer_key_text = st.text_area(
            "Enter answer key with question numbers and marks:",
            height=400,
            placeholder="""Example:

Question 1: Machine learning is a subset of AI... [10 marks]

Question 2: Binary Search Tree is a hierarchical data structure... [15 marks]

Q3: Deadlock occurs when processes wait for resources... [10 marks]
""",
            key="ak_text"
        )

    with col2:
        st.markdown("<br><br>", unsafe_allow_html=True)
        if st.button("📥 Load Answer Key", use_container_width=True):
            if answer_key_text:
                answer_key = st.session_state.question_extractor.parse_answer_key(answer_key_text)
                st.session_state.answer_key = answer_key
                st.success(f"✅ Loaded {len(answer_key)} questions.")
                st.rerun()
            else:
                st.error("Please enter answer key text.")

    if st.session_state.answer_key:
        st.markdown("---")
        st.subheader("Loaded Answer Key")
        for q_num, data in sorted(st.session_state.answer_key.items()):
            with st.expander(f"Question {q_num} - [{data['marks']} marks]"):
                st.write(data['answer'])

with tab2:
    st.header("Step 2: Paste Student Answers")
    if not st.session_state.answer_key:
        st.warning("Please load the answer key first (Step 1).")
    else:
        col1, col2 = st.columns([1, 1])
        with col1:
            student_name = st.text_input("Student Name:", placeholder="Enter student name")
            student_id   = st.text_input("Student ID:", placeholder="Enter student ID")
            answer_sheet_text = st.text_area(
                "Enter student answers:",
                height=400,
                placeholder="""Example:

Question 1: Machine learning helps computers learn from data...

Question 2: BST is a tree where left child is smaller...

Q3: Deadlock happens when processes wait for each other...
"""
            )
            if st.button("📥 Load Student Answers"):
                if answer_sheet_text and student_name:
                    student_answers = st.session_state.question_extractor.extract_questions(answer_sheet_text)
                    from rapidfuzz import fuzz
                    mapping = {}
                    for a_q in st.session_state.answer_key.keys():
                        best_match = None
                        best_score = 0
                        for s_q in student_answers.keys():
                            score = fuzz.ratio(str(a_q), str(s_q))
                            if score > 80 and score > best_score:
                                best_score = score
                                best_match = s_q
                        if best_match:
                            mapping[a_q] = best_match
                    remapped = {mapped_q: student_answers[orig_q] for orig_q, mapped_q in mapping.items()}
                    st.session_state.student_answers = remapped
                    st.session_state.student_name = student_name
                    st.session_state.student_id = student_id
                    st.success(f"✅ Loaded {len(remapped)} answers (after fuzzy matching).")
                    st.rerun()
                else:
                    st.error("Please enter student name and answers!")
        with col2:
            st.subheader("Extracted Student Answers")
            if st.session_state.student_answers:
                st.success(f"✅ {len(st.session_state.student_answers)} answers extracted")
                for q_num, ans in sorted(st.session_state.student_answers.items()):
                    with st.expander(f"Question {q_num}"):
                        st.write(ans[:200] + "..." if len(ans) > 200 else ans)
            else:
                st.info("Paste student answers to see preview here.")

        if st.session_state.student_answers and st.session_state.answer_key:
            st.markdown("---")
            if st.button("🎯 EVALUATE EXAM", type="primary"):
                with st.spinner("Evaluating..."):
                    results = []
                    total_obtained = 0
                    total_max = 0
                    for q_num in st.session_state.answer_key.keys():
                        model = st.session_state.answer_key[q_num]['answer']
                        max_m = st.session_state.answer_key[q_num]['marks']
                        if q_num in st.session_state.student_answers:
                            student = st.session_state.student_answers[q_num]
                            eval_res = st.session_state.evaluator.evaluate_answer(student, model, max_m)
                            results.append({
                                'question_num': q_num,
                                'obtained': eval_res['awarded_marks'],
                                'max': max_m,
                                'percentage': eval_res['percentage'],
                                'keyword_score': eval_res['keyword_score'],
                                'tfidf_score': eval_res['tfidf_score'],
                                'bert_score': eval_res['bert_score'],
                                'student_answer': student,
                            })
                            total_obtained += eval_res['awarded_marks']
                        else:
                            results.append({
                                'question_num': q_num,
                                'obtained': 0,
                                'max': max_m,
                                'percentage': 0,
                                'keyword_score': 0,
                                'tfidf_score': 0,
                                'bert_score': 0,
                                'student_answer': "NOT ATTEMPTED",
                            })
                        total_max += max_m
                    st.session_state.evaluation_results = {
                        'results': results,
                        'total_obtained': total_obtained,
                        'total_max': total_max,
                        'percentage': (total_obtained / total_max * 100) if total_max > 0 else 0,
                        'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        'strictness_used': st.session_state.strictness,
                    }
                    st.success("✅ Evaluation complete!")
                    st.rerun()

with tab3:
    st.header("Evaluation Results")
    if not st.session_state.evaluation_results:
        st.info("No results yet. Please complete Steps 1 and 2, then click 'Evaluate Exam'.")
    else:
        res = st.session_state.evaluation_results
        st.subheader("Student Information")
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Name", st.session_state.get('student_name', 'N/A'))
        c2.metric("ID", st.session_state.get('student_id', 'N/A'))
        c3.metric("Date", res['timestamp'])
        c4.metric("Mode", res.get('strictness_used', 'balanced').capitalize())

        st.markdown("---")
        st.subheader("Final Score")
        grade, gclass = calculate_grade(res['percentage'])
        col1, col2, col3, col4 = st.columns(4)
        col1.markdown(f'<div class="score-card {gclass}">Grade<br>{grade}</div>', unsafe_allow_html=True)
        col2.metric("Total Marks", f"{res['total_obtained']:.2f} / {res['total_max']}")
        col3.metric("Percentage", f"{res['percentage']:.2f}%")
        attempted = sum(1 for r in res['results'] if r['student_answer'] != "NOT ATTEMPTED")
        col4.metric("Attempted", f"{attempted} / {len(res['results'])}")

        st.markdown("---")
        st.subheader("Question-wise Breakdown")
        for r in res['results']:
            emoji = "✅" if r['percentage'] >= 75 else ("⚠️" if r['percentage'] >= 50 else "❌")
            with st.expander(f"{emoji} Q{r['question_num']}: {r['obtained']}/{r['max']} marks ({r['percentage']:.1f}%)"):
                col_a, col_b = st.columns(2)
                with col_a:
                    st.markdown("**Model Answer:**")
                    st.info(st.session_state.answer_key[r['question_num']]['answer'])
                with col_b:
                    st.markdown("**Student Answer:**")
                    if r['student_answer'] == "NOT ATTEMPTED":
                        st.error("NOT ATTEMPTED")
                    else:
                        st.write(r['student_answer'])
                st.markdown("**Score Breakdown:**")
                sc1, sc2, sc3 = st.columns(3)
                sc1.metric("Keyword", f"{r['keyword_score']*100:.1f}%")
                sc2.metric("TF-IDF", f"{r['tfidf_score']*100:.1f}%")
                sc3.metric("BERT", f"{r['bert_score']*100:.1f}%")
                st.progress(r['percentage'] / 100)

        st.markdown("---")
        report_data = {
            'Student Name': [st.session_state.get('student_name', 'N/A')],
            'Student ID': [st.session_state.get('student_id', 'N/A')],
            'Total Marks': [f"{res['total_obtained']:.2f}/{res['total_max']}"],
            'Percentage': [f"{res['percentage']:.2f}%"],
            'Grade': [grade],
            'Grading Mode': [res.get('strictness_used', 'balanced')],
            'Date': [res['timestamp']],
        }
        for r in res['results']:
            report_data[f"Q{r['question_num']}"] = [f"{r['obtained']}/{r['max']}"]
        df = pd.DataFrame(report_data)
        csv = df.to_csv(index=False)
        st.download_button("📥 Download Report (CSV)", data=csv,
                           file_name=f"exam_report_{st.session_state.get('student_id', 'student')}.csv",
                           mime="text/csv", use_container_width=True)

with tab4:
    st.header("🔍 AI Writing Detection")
    if not st.session_state.student_answers:
        st.info("Please load student answers first (Step 2).")
    else:
        detector = load_ai_detector()
        if detector is None:
            st.error("AI detection model could not be loaded. Please install `transformers` and ensure internet connection.")
        else:
            if st.button("🔍 Run AI Detection"):
                with st.spinner("Analyzing answers for AI-generated text..."):
                    ai_scores = []
                    for q_num, ans in st.session_state.student_answers.items():
                        prob = detect_ai_text(ans, detector)
                        ai_scores.append({
                            'Question': q_num,
                            'Answer Snippet': ans[:200] + "..." if len(ans) > 200 else ans,
                            'AI Probability': f"{prob:.2%}",
                            'Risk': "High" if prob > 0.7 else ("Medium" if prob > 0.3 else "Low")
                        })
                    st.session_state.ai_results = ai_scores
                    st.success("Detection completed.")
            if st.session_state.ai_results:
                df_ai = pd.DataFrame(st.session_state.ai_results)

                def style_risk(val):
                    if val == "High":
                        return 'background-color: #ffcccc; color: black; font-weight: bold; text-align: center;'
                    elif val == "Medium":
                        return 'background-color: #fff0cc; color: black; font-weight: bold; text-align: center;'
                    else:
                        return 'background-color: #ccffcc; color: black; font-weight: bold; text-align: center;'

                styled = (
                    df_ai.style
                    .map(style_risk, subset=['Risk'])
                    .set_properties(subset=['Risk'], **{
                        'text-align': 'center',
                        'color': 'black',
                        'font-weight': 'bold'
                    })
                    .set_properties(subset=['Question'], **{
                        'text-align': 'center',
                        'font-weight': 'bold'
                    })
                )

                st.dataframe(styled, use_container_width=True, hide_index=True)
                st.caption("High probability (>70%) suggests AI-generated content. Use this as a hint, not proof.")
with tab5:
    st.header("📈 Performance Statistics")
    if not st.session_state.evaluation_results:
        st.info("📝 No statistics available yet. Please evaluate an exam first.")
    else:
        res = st.session_state.evaluation_results
        results_list = res['results']
        percentages = [r['percentage'] for r in results_list]
        
        col1, col2 = st.columns(2)
        with col1:
            st.subheader("📊 Score Distribution")
            df_scores = pd.DataFrame([
                {'Question': f"Q{r['question_num']}", 'Obtained': r['obtained'], 'Maximum': r['max'], 
                 'Percentage': r['percentage'], 'BERT Score': f"{r['bert_score']*100:.1f}%"}
                for r in results_list
            ])
            st.dataframe(df_scores, use_container_width=True, hide_index=True)
        
        with col2:
            st.subheader("📉 Performance Analysis")
            stats = {
                'Metric': ['Average Score', 'Highest Score', 'Lowest Score', 
                           'Questions Above 75%', 'Questions Below 50%', 'Grading Mode Used'],
                'Value': [
                    f"{np.mean(percentages):.2f}%",
                    f"{np.max(percentages):.2f}%",
                    f"{np.min(percentages):.2f}%",
                    sum(1 for p in percentages if p >= 75),
                    sum(1 for p in percentages if p < 50),
                    res.get('strictness_used', 'balanced').capitalize()
                ]
            }
            df_stats = pd.DataFrame(stats)
            st.dataframe(df_stats, use_container_width=True, hide_index=True)
        
        st.markdown("---")
        st.subheader("💪 Strengths & Weaknesses")
        col_sw1, col_sw2 = st.columns(2)
        with col_sw1:
            st.markdown("**✅ Strong Areas (≥75%)**")
            strong = [r for r in results_list if r['percentage'] >= 75]
            if strong:
                for r in strong:
                    st.success(f"Question {r['question_num']}: {r['percentage']:.1f}%")
            else:
                st.info("No questions scored above 75%")
        with col_sw2:
            st.markdown("**⚠️ Needs Improvement (<50%)**")
            weak = [r for r in results_list if r['percentage'] < 50]
            if weak:
                for r in weak:
                    st.error(f"Question {r['question_num']}: {r['percentage']:.1f}%")
            else:
                st.success("All questions scored above 50%!")

st.markdown("---")
st.markdown("<div style='text-align: center; color: #666;'><p>Online Exam Evaluator with AI Detection | For teachers only</p></div>", unsafe_allow_html=True)