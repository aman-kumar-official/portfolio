const API_KEY = 'd001423d6edd4fed93682049250104';

const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const cityName = document.getElementById('city-name');
const dateElement = document.getElementById('date');
const temperature = document.getElementById('temperature');
const weatherDescription = document.getElementById('weather-description');
const weatherIcon = document.getElementById('weather-icon');
const feelsLike = document.getElementById('feels-like');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('wind-speed');
const pressure = document.getElementById('pressure');
const forecastItems = document.getElementById('forecast-items');

const today = new Date();
const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
dateElement.textContent = today.toLocaleDateString('en-US', options);

searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        getWeatherData(city);
    }
});

locationBtn.addEventListener('click', getLocationWeather);

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) {
            getWeatherData(city);
        }
    }
});

getWeatherData('Jamshedpur');

async function getWeatherData(city) {
    try {
        const currentResponse = await fetch(
            `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${city}`
        );
        
        if (!currentResponse.ok) {
            const errorData = await currentResponse.json();
            throw new Error(errorData.error?.message || 'City not found');
        }
        
        const currentData = await currentResponse.json();
        displayCurrentWeather(currentData);
        
        const forecastResponse = await fetch(
            `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${city}&days=5`
        );
        const forecastData = await forecastResponse.json();
        displayForecast(forecastData);
        
    } catch (error) {
        alert(`Error: ${error.message}`);
        console.error('WeatherAPI Error:', error);
    }
}

function displayCurrentWeather(data) {
    cityName.textContent = `${data.location.name}, ${data.location.country}`;
    temperature.textContent = `${Math.round(data.current.temp_c)}°C`;
    weatherDescription.textContent = data.current.condition.text;
    feelsLike.textContent = `${Math.round(data.current.feelslike_c)}°C`;
    humidity.textContent = `${data.current.humidity}%`;
    windSpeed.textContent = `${data.current.wind_kph} km/h`;
    pressure.textContent = `${data.current.pressure_mb} hPa`;
    
    const iconUrl = data.current.condition.icon.startsWith('//') 
        ? `https:${data.current.condition.icon}`
        : data.current.condition.icon;
    
    weatherIcon.innerHTML = `<img src="${iconUrl}" alt="${data.current.condition.text}">`;
}

function displayForecast(data) {
    forecastItems.innerHTML = '';
    
    if (!data.forecast?.forecastday) {
        console.error("No forecast data found:", data);
        return;
    }

    data.forecast.forecastday.forEach(day => {
        const date = new Date(day.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        const iconUrl = day.day.condition.icon.startsWith('//') 
            ? `https:${day.day.condition.icon}`
            : day.day.condition.icon;

        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        forecastItem.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <img src="${iconUrl}" alt="${day.day.condition.text}" class="forecast-icon">
            <div class="forecast-temp">${Math.round(day.day.avgtemp_c)}°C</div>
        `;
        
        forecastItems.appendChild(forecastItem);
    });
}

function getLocationWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const city = `${latitude},${longitude}`;
                    cityInput.value = 'Your Location';
                    getWeatherData(city);
                } catch (error) {
                    console.error('Location Error:', error);
                    alert('Could not get weather for your location.');
                }
            },
            (error) => {
                console.error('Geolocation Error:', error);
                alert('Please enable location services to use this feature.');
            }
        );
    } else {
        alert('Geolocation is not supported by your browser.');
    }
}

function handleApiError(response) {
    if (!response.ok) {
        return response.json().then(errorData => {
            throw new Error(errorData.error?.message || 'API request failed');
        });
    }
    return response.json();
}