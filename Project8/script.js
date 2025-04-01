document.addEventListener('DOMContentLoaded', function() {
    // Add scroll effect to navbar
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            document.querySelector('.navbar').classList.add('scrolled');
        } else {
            document.querySelector('.navbar').classList.remove('scrolled');
        }
    });

    // Movie data with YouTube trailer links
    const movies = {
        popular: [
            { title: "Stranger Things", image: "https://m.media-amazon.com/images/M/MV5BMmMyYzk4ZWYtNjU0ZS00N2I5LWFkZGItMDRmODc1M2M2NTIxXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg", trailer: "https://www.youtube.com/embed/b9EkMc79ZSU" },
            { title: "The Witcher", image: "https://image.tmdb.org/t/p/w500/7vjaCdMw15FEbXyLQTVa04URsPm.jpg", trailer: "https://www.youtube.com/embed/ndl1W4ltcmg" },
            { title: "Money Heist", image: "https://image.tmdb.org/t/p/w500/reEMJA1uzscCbkpeRJeTT2bjqUp.jpg", trailer: "https://www.youtube.com/embed/_InqQJRqGW4" },
            { title: "Extraction 2",image: "https://image.tmdb.org/t/p/w500/7gKI9hpEMcZUQpNgKrkDzJpbnNS.jpg", trailer: "https://www.youtube.com/embed/Y274jZs5s7s?autoplay=1&mute=1" },
            { title: "Bridgerton", image: "https://image.tmdb.org/t/p/original/zzOJK5WlVPgk09Jk2jmXdi9nei4.jpg", trailer: "https://www.youtube.com/embed/gpv7ayf_tyE" },
            { title: "Dark", image: "https://i.pinimg.com/originals/67/5e/bc/675ebc2fd210a8bd5362928a51514960.jpg", trailer: "https://www.youtube.com/embed/ESEUoa-mz2c" },
            { title: "The Crown", image: "https://static1.tribute.ca/poster/660x980/the-crown-netflix-121503.jpg", trailer: "https://www.youtube.com/embed/JWtnJjn6ng0" }
        ],
        trending: [
            { title: "Squid Game", image: "https://image.tmdb.org/t/p/w500/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg", trailer: "https://www.youtube.com/embed/oqxAJKy0ii4" },
            { title: "Peaky Blinders", image: "https://image.tmdb.org/t/p/w500/6PX0r5TRRU5y0jZ70y1OtbLYmoD.jpg", trailer: "https://www.youtube.com/embed/oVzVdvGIC7U" },
            { title: "Breaking Bad", image: "https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg", trailer: "https://www.youtube.com/embed/HhesaQXLuRY" },
            { title: "Narcos", image: "https://www.comingsoon.net/wp-content/uploads/sites/3/gallery/narcos/narcos0003.jpg", trailer: "https://www.youtube.com/embed/xl8zdCY-abw" },
            { title: "Ozark", image: "https://static1.tribute.ca/poster/660x980/ozark-netflix-144667.jpg", trailer: "https://www.youtube.com/embed/5hAXVqrljbs" },
            { title: "The Last of Us", image: "https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg", trailer: "https://www.youtube.com/embed/uLtkt8BonwM" }
        ],
        continue: [
            { title: "Black Mirror", image: "https://vignette.wikia.nocookie.net/black-mirror/images/f/f6/Black_Mirror_Netflix_Poster.jpg/revision/latest?cb=20171230155236&path-prefix=de", trailer: "https://www.youtube.com/embed/jDiYGjp5iFg" },
            { title: "The Mandalorian", image: "https://image.tmdb.org/t/p/w500/sWgBv7LV2PRoQgkxwlibdGXKz1S.jpg", trailer: "https://www.youtube.com/embed/eW7Twd85m2g" },
            { title: "House of Cards", image: "https://th.bing.com/th/id/R.82f509030e24bc8f19e77c23b12f7d2f?rik=uyYAxCJxnq1X%2bA&riu=http%3a%2f%2fcollider.com%2fwp-content%2fuploads%2fhouse-of-cards-final-poster.jpg&ehk=zmjmmHNJPdfWVxj4Tdf%2fPNtSiWz8vwNU6ASpxmYeZkc%3d&risl=&pid=ImgRaw&r=0", trailer: "https://www.youtube.com/embed/8QnMmpfKWvo" },
            { title: "The Gray Man", image: "https://image.tmdb.org/t/p/w500/8cXbitsS6dWQ5gfMTZdorpAAzEH.jpg", trailer: "https://www.youtube.com/embed/BmllggGO4pM?autoplay=1&mute=1" },
            { title: "Daredevil", image: "https://image.tmdb.org/t/p/w500/QWbPaDxiB6LW2LjASknzYBvjMj.jpg", trailer: "https://www.youtube.com/embed/jAy6NJ_D5vU" }
        ],
        new: [
            { title: "Wednesday", image: "https://image.tmdb.org/t/p/w500/jeGtaMwGxPmQN5xM4ClnwPQcNQz.jpg", trailer: "https://www.youtube.com/embed/Di310WS8zLk" },
            { title: "You", image: "https://static1.tribute.ca/poster/660x980/you-netflix-142415.jpg", trailer: "https://www.youtube.com/embed/ga1m0wjzscU" },
            { title: "The Adam Project",  image: "https://image.tmdb.org/t/p/w500/wFjboE0aFZNbVOF05fzrka9Fqyx.jpg",  trailer: "https://www.youtube.com/embed/IE8HIsIrq4o?autoplay=1&mute=1" },
            { title: "The Mother", image: "https://image.tmdb.org/t/p/w500/vnRthEZz16Q9VWcP5homkHxyHoy.jpg", trailer: "https://www.youtube.com/embed/8BFdFeOS3oM?autoplay=1&mute=1" },
            { title: "The Umbrella Academy", image: "https://image.tmdb.org/t/p/w500/scZlQQYnDVlnpxFTxaIv2g0BWnL.jpg", trailer: "https://www.youtube.com/embed/0DAmWHxeoKw" }
        ]
    };

    // Populate movie rows
    for (const category in movies) {
        const row = document.getElementById(category);
        movies[category].forEach(movie => {
            const movieCard = document.createElement('div');
            movieCard.className = 'movie-card';
            movieCard.innerHTML = `
                <img src="${movie.image}" alt="${movie.title}">
            `;
            
            // Add click event to show trailer
            movieCard.addEventListener('click', function() {
                const modal = new bootstrap.Modal(document.getElementById('trailerModal'));
                document.getElementById('trailerVideo').src = movie.trailer;
                document.getElementById('trailerModalTitle').textContent = movie.title;
                modal.show();
            });
            
            row.appendChild(movieCard);
        });
    }

    // Reset video when modal is closed
    document.getElementById('trailerModal').addEventListener('hidden.bs.modal', function () {
        document.getElementById('trailerVideo').src = '';
    });
});