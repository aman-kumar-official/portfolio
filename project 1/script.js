const apiKey = 'YOUR_OPENWEATHERMAP_API_KEY'; // Replace with your API key
        const searchBtn = document.getElementById('search-btn');
        const searchInput = document.getElementById('search-input');
        const weatherIcon = document.querySelector('.weather-icon i');
        const body = document.body;
        
        // Default weather data
        let weatherData = {
            temp: 33,
            city: "Chennai",
            humidity: 64,
            wind: 12,
            weather: "Clear"
        };
        
        // Update DOM with weather data
        function updateWeather(data) {
            document.getElementById('temp').textContent = `${Math.round(data.temp)}°C`;
            document.getElementById('city').textContent = data.city;
            document.getElementById('humidity').textContent = `${data.humidity}%`;
            document.getElementById('wind').textContent = `${data.wind} km/h`;
            
            // Update icon and background based on weather
            switch(data.weather.toLowerCase()) {
                case 'clear':
                    weatherIcon.className = 'fas fa-sun';
                    body.className = '';
                    break;
                case 'rain':
                    weatherIcon.className = 'fas fa-cloud-rain';
                    body.className = 'rainy-bg';
                    break;
                case 'clouds':
                    weatherIcon.className = 'fas fa-cloud';
                    body.className = 'cloudy-bg';
                    break;
                case 'snow':
                    weatherIcon.className = 'fas fa-snowflake';
                    break;
                case 'thunderstorm':
                    weatherIcon.className = 'fas fa-bolt';
                    break;
                default:
                    weatherIcon.className = 'fas fa-smog';
            }
        }
        
        // Fetch weather from API
        async function fetchWeather(city) {
            try {
                const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`);
                const data = await response.json();
                
                if(data.cod === 200) {
                    weatherData = {
                        temp: data.main.temp,
                        city: data.name,
                        humidity: data.main.humidity,
                        wind: data.wind.speed,
                        weather: data.weather[0].main
                    };
                    updateWeather(weatherData);
                } else {
                    alert('City not found. Please try again.');
                }
            } catch(error) {
                console.error('Error fetching weather:', error);
                alert('Error fetching weather data. Please try again later.');
            }
        }
        
        // Event listeners
        searchBtn.addEventListener('click', () => {
            const city = searchInput.value.trim();
            if(city) {
                fetchWeather(city);
            }
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') {
                const city = searchInput.value.trim();
                if(city) {
                    fetchWeather(city);
                }
            }
        });
        
        // Initialize with default data
        updateWeather(weatherData);