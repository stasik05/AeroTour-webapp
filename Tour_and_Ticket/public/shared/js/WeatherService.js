class WeatherService {
  static async searchCity(cityName) {
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=5&language=ru&format=json`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Ошибка при поиске города:', error);
      throw error;
    }
  }

  static async getWeatherData(latitude, longitude, startDate = null, endDate = null) {
    try {
      const today = new Date();
      const start = startDate ? new Date(startDate) : today;
      const end = endDate ? new Date(endDate) : start;
      const isHistorical = start < today;
      const daysFromToday = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
      const isLongTermForecast = daysFromToday > 16;
      if (isLongTermForecast) {
        return await this.getClimateForecast(latitude, longitude, startDate, endDate);
      } else if (isHistorical) {
        return await this.getHistoricalData(latitude, longitude, startDate, endDate);
      } else {
        return await this.getShortTermForecast(latitude, longitude, startDate, endDate);
      }
    } catch (error) {
      console.error('Ошибка при получении данных о погоде:', error);
      return await this.generateRealisticWeather(latitude, longitude, startDate, endDate);
    }
  }
  static async getShortTermForecast(latitude, longitude, startDate, endDate) {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      daily: 'temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,uv_index_max',
      timezone: 'auto',
      forecast_days: 16
    });

    if (startDate && endDate) {
      params.delete('forecast_days');
      params.append('start_date', startDate);
      params.append('end_date', endDate);
    }
    const url = `https://api.open-meteo.com/v1/forecast?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    data.metadata = {
      type: 'short_term_forecast',
      source: 'open-meteo',
      reliability: 'high'
    };
    return data;
  }
  static async getHistoricalData(latitude, longitude, startDate, endDate) {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      start_date: startDate,
      end_date: endDate || startDate,
      daily: 'temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,wind_speed_10m_max,precipitation_hours',
      timezone: 'auto'
    });
    const url = `https://archive-api.open-meteo.com/v1/archive?${params}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    data.metadata = {
      type: 'historical',
      source: 'open-meteo-archive',
      reliability: 'high'
    };

    return data;
  }
  static async getClimateForecast(latitude, longitude, startDate, endDate) {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        start_date: startDate,
        end_date: endDate,
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code',
        models: 'CMCC_CM2_VHR4',
        timezone: 'auto'
      });

      const url = `https://climate-api.open-meteo.com/v1/climate?${params}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        data.metadata = {
          type: 'climate_forecast',
          source: 'open-meteo-climate',
          reliability: 'medium'
        };
        return data;
      }
    } catch (error) {
      console.warn('Климатическое API недоступно:', error);
    }
    return await this.getAverageClimateData(latitude, longitude, startDate, endDate);
  }
  static async getAverageClimateData(latitude, longitude, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate || startDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const time = [];
    const temperature_2m_max = [];
    const temperature_2m_min = [];
    const weather_code = [];
    const precipitation_sum = [];
    const wind_speed_10m_max = [];

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);

      const dateString = currentDate.toISOString().split('T')[0];
      time.push(dateString);
      const weather = this.generateClimateData(latitude, longitude, currentDate);
      temperature_2m_max.push(weather.tempMax);
      temperature_2m_min.push(weather.tempMin);
      weather_code.push(weather.weatherCode);
      precipitation_sum.push(weather.precipitation);
      wind_speed_10m_max.push(weather.windSpeed);
    }

    const data = {
      daily: {
        time,
        temperature_2m_max,
        temperature_2m_min,
        weather_code,
        precipitation_sum,
        wind_speed_10m_max
      },
      metadata: {
        type: 'climate_average',
        source: 'calculated',
        reliability: 'medium',
        note: 'На основе многолетних климатических норм'
      }
    };

    return data;
  }
  static generateClimateData(latitude, longitude, date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const baseTemp = this.calculateBaseTemperature(latitude, month);
    const seasonalVariation = this.getSeasonalVariation(month, day);
    const randomVariation = (Math.random() - 0.5) * 6;
    const tempMax = Math.round(baseTemp + 5 + seasonalVariation + randomVariation);
    const tempMin = Math.round(baseTemp - 5 + seasonalVariation + randomVariation * 0.7);

    const weatherCode = this.getSeasonalWeatherCode(latitude, month);

    const precipitation = this.calculatePrecipitation(weatherCode, month);

    const windSpeed = this.calculateWindSpeed(month, latitude);

    return {
      tempMax,
      tempMin,
      weatherCode,
      precipitation: Math.round(precipitation * 100) / 100,
      windSpeed: Math.round(windSpeed)
    };
  }
  static calculateBaseTemperature(latitude, month) {
    const absLatitude = Math.abs(latitude);
    const temperatureProfiles = {
      equatorial: [27, 27, 28, 28, 28, 27, 27, 27, 27, 27, 27, 27],
      subtropical: [18, 19, 22, 26, 30, 33, 35, 34, 30, 26, 22, 19],
      temperate: [5, 6, 10, 15, 20, 24, 26, 25, 20, 14, 9, 6],
      subarctic: [-8, -7, -2, 5, 12, 18, 20, 18, 12, 5, -2, -6],
      arctic: [-20, -19, -15, -8, 0, 6, 8, 6, 2, -5, -12, -18]
    };

    let zone;
    if (absLatitude <= 23.5) zone = 'equatorial';
    else if (absLatitude <= 35) zone = 'subtropical';
    else if (absLatitude <= 55) zone = 'temperate';
    else if (absLatitude <= 66.5) zone = 'subarctic';
    else zone = 'arctic';
    let adjustedMonth = latitude >= 0 ? month : (month + 6) % 12 || 12;
    return temperatureProfiles[zone][adjustedMonth - 1];
  }
  static getSeasonalVariation(month, day) {
    const monthProgress = day / 30;
    const seasonalCycle = Math.sin((month - 1) * Math.PI / 6) * 3;
    const monthlyVariation = (Math.random() - 0.5) * 4;
    return seasonalCycle + monthlyVariation;
  }
  static getSeasonalWeatherCode(latitude, month) {
    const adjustedMonth = latitude >= 0 ? month : (month + 6) % 12 || 12;
    const seasonalWeather = {
      winter: [0, 1, 2, 3, 45, 71, 73, 75],
      spring: [0, 1, 2, 3, 51, 53, 61, 63, 80],
      summer: [0, 1, 2, 3, 61, 63, 65, 80, 81, 95, 96],
      autumn: [0, 1, 2, 3, 51, 53, 61, 63, 45]
    };

    let season;
    if ([12, 1, 2].includes(adjustedMonth)) season = 'winter';
    else if ([3, 4, 5].includes(adjustedMonth)) season = 'spring';
    else if ([6, 7, 8].includes(adjustedMonth)) season = 'summer';
    else season = 'autumn';

    const codes = seasonalWeather[season];
    return codes[Math.floor(Math.random() * codes.length)];
  }

  static calculatePrecipitation(weatherCode, month) {
    const precipitationRates = {

      51: 0.5, 53: 1.0, 55: 2.0,
      61: 2.0, 63: 5.0, 65: 10.0,
      80: 3.0, 81: 8.0, 82: 15.0,
      71: 1.0, 73: 3.0, 75: 6.0,
      95: 8.0, 96: 12.0, 99: 15.0
    };

    let basePrecipitation = precipitationRates[weatherCode] || 0;
    const seasonalMultiplier = this.getPrecipitationMultiplier(month);
    return basePrecipitation * seasonalMultiplier;
  }

  static getPrecipitationMultiplier(month) {
    const precipitationPattern = {
      1: 1.0, 2: 0.9, 3: 1.1, 4: 1.2, 5: 1.3, 6: 1.4,
      7: 1.2, 8: 1.1, 9: 1.0, 10: 1.1, 11: 1.0, 12: 1.0
    };

    return precipitationPattern[month] || 1.0;
  }

  static calculateWindSpeed(month, latitude) {
    const baseWind = {
      winter: 15,
      spring: 12,
      summer: 8,
      autumn: 10
    };

    const adjustedMonth = latitude >= 0 ? month : (month + 6) % 12 || 12;

    let season;
    if ([12, 1, 2].includes(adjustedMonth)) season = 'winter';
    else if ([3, 4, 5].includes(adjustedMonth)) season = 'spring';
    else if ([6, 7, 8].includes(adjustedMonth)) season = 'summer';
    else season = 'autumn';

    const baseSpeed = baseWind[season];
    const variation = (Math.random() - 0.5) * 8;
    return Math.max(5, baseSpeed + variation);
  }
  static async generateRealisticWeather(latitude, longitude, startDate, endDate) {
    const start = new Date(startDate || new Date());
    const end = new Date(endDate || start);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const time = [];
    const temperature_2m_max = [];
    const temperature_2m_min = [];
    const weather_code = [];
    const precipitation_probability_max = [];
    const precipitation_sum = [];
    const wind_speed_10m_max = [];

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);

      const dateString = currentDate.toISOString().split('T')[0];
      time.push(dateString);

      const weather = this.generateRealisticDailyWeather(latitude, longitude, currentDate);

      temperature_2m_max.push(weather.tempMax);
      temperature_2m_min.push(weather.tempMin);
      weather_code.push(weather.weatherCode);
      precipitation_probability_max.push(weather.precipitationProbability);
      precipitation_sum.push(weather.precipitation);
      wind_speed_10m_max.push(weather.windSpeed);
    }

    const data = {
      daily: {
        time,
        temperature_2m_max,
        temperature_2m_min,
        weather_code,
        precipitation_probability_max,
        precipitation_sum,
        wind_speed_10m_max
      },
      metadata: {
        type: 'generated',
        source: 'fallback',
        reliability: 'low',
        note: 'Данные сгенерированы на основе климатических норм'
      }
    };

    return data;
  }
  static generateRealisticDailyWeather(latitude, longitude, date) {
    const month = date.getMonth() + 1;
    const baseTemp = this.calculateBaseTemperature(latitude, month);
    const dailyVariation = (Math.random() - 0.5) * 10;
    const tempMax = Math.round(baseTemp + 5 + dailyVariation);
    const tempMin = Math.round(baseTemp - 5 + dailyVariation * 0.6);

    const weatherCode = this.getSeasonalWeatherCode(latitude, month);
    const precipitationProbability = this.calculatePrecipitationProbability(weatherCode, month);
    const precipitation = precipitationProbability > 30 ?
      (precipitationProbability / 100) * 10 * Math.random() : 0;

    const windSpeed = this.calculateWindSpeed(month, latitude);

    return {
      tempMax,
      tempMin,
      weatherCode,
      precipitationProbability: Math.round(precipitationProbability),
      precipitation: Math.round(precipitation * 100) / 100,
      windSpeed: Math.round(windSpeed)
    };
  }
  static calculatePrecipitationProbability(weatherCode, month) {
    const baseProbabilities = {
      0: 0, 1: 10, 2: 20, 3: 30,
      45: 40, 48: 50,
      51: 60, 53: 70, 55: 80,
      61: 70, 63: 80, 65: 90,
      80: 75, 81: 85, 82: 95,
      71: 60, 73: 70, 75: 80,
      95: 85, 96: 90, 99: 95
    };

    let probability = baseProbabilities[weatherCode] || 20;
    const seasonalAdjustment = this.getSeasonalPrecipitationAdjustment(month);
    probability = Math.min(95, Math.max(5, probability + seasonalAdjustment));

    return probability;
  }
  static getSeasonalPrecipitationAdjustment(month) {
    const adjustments = {
      1: 0, 2: -5, 3: 5, 4: 10, 5: 15, 6: 20,
      7: 15, 8: 10, 9: 5, 10: 0, 11: -5, 12: -5
    };

    return adjustments[month] || 0;
  }
  static getWeatherDescription(weatherCode) {
    const weatherCodes = {
      0: 'Ясно',
      1: 'Преимущественно ясно',
      2: 'Переменная облачность',
      3: 'Пасмурно',
      45: 'Туман',
      48: 'Туман с инеем',
      51: 'Слабая морось',
      53: 'Умеренная морось',
      55: 'Сильная морось',
      56: 'Слабая ледяная морось',
      57: 'Сильная ледяная морось',
      61: 'Слабый дождь',
      63: 'Умеренный дождь',
      65: 'Сильный дождь',
      66: 'Слабый ледяной дождь',
      67: 'Сильный ледяной дождь',
      71: 'Слабый снег',
      73: 'Умеренный снег',
      75: 'Сильный снег',
      77: 'Снежные зерна',
      80: 'Слабый ливень',
      81: 'Умеренный ливень',
      82: 'Сильный ливень',
      85: 'Слабый снегопад',
      86: 'Сильный снегопад',
      95: 'Гроза',
      96: 'Гроза с градом',
      99: 'Сильная гроза с градом'
    };

    return weatherCodes[weatherCode] || 'Неизвестно';
  }

  static getWeatherIcon(weatherCode) {
    const weatherIcons = {
      0: 'sunny',
      1: 'partly_cloudy_day',
      2: 'partly_cloudy_day',
      3: 'cloudy',
      45: 'foggy',
      48: 'foggy',
      51: 'rainy',
      53: 'rainy',
      55: 'rainy',
      61: 'rainy',
      63: 'rainy',
      65: 'rainy',
      71: 'weather_snowy',
      73: 'weather_snowy',
      75: 'weather_snowy',
      80: 'rainy',
      81: 'rainy',
      82: 'rainy',
      85: 'weather_snowy',
      86: 'weather_snowy',
      95: 'thunderstorm',
      96: 'thunderstorm',
      99: 'thunderstorm'
    };

    return weatherIcons[weatherCode] || 'cloud';
  }

  static formatTemperature(temp) {
    return `${Math.round(temp)}°C`;
  }

  static formatDateDisplay(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  static formatDateShort(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  }

  static getMinDate() {
    const minDate = new Date();
    minDate.setFullYear(2020);
    return minDate.toISOString().split('T')[0];
  }

  static getMaxDate() {
    const maxDate = new Date();
    maxDate.setFullYear(2026, 11, 31);
    return maxDate.toISOString().split('T')[0];
  }

  static getDataReliability(data) {
    return data.metadata?.reliability || 'unknown';
  }

  static getDataSource(data) {
    return data.metadata?.source || 'unknown';
  }
}

export { WeatherService };