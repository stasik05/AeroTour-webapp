class Flight
{
    #id;
    #airline;
    #flightNumber;
    #departureCity;
    #arrivalCity;
    #departureTime;
    #arrivalTime;
    #price;
    #available;
    #images = [];
    #reviews = [];
    constructor(id = null,airline = '',flightNumber = '',departureCity = '',arrivalCity = '',departureTime = null,arrivalTime = null,price = 0.0,available = true)
    {
        this.#id = id;
        this.#airline = airline;
        this.#flightNumber = flightNumber;
        this.#departureCity = departureCity;
        this.#arrivalCity = arrivalCity;
        this.#departureTime = departureTime ? new Date(departureTime):null;
        this.#arrivalTime = arrivalTime ? new Date(departureTime):null;
        this.#price = price;
        this.#available = available;
    }
    get flightId()
    {
        return this.#id;
    }
    get flightAirline()
    {
        return this.#airline;
    }
    get flightNumber()
    {
        return this.#flightNumber;
    }
    get flightDepartureCity()
    {
        return this.#departureCity;
    }
    get fligthArrivalCity()
    {
        return this.#arrivalCity;
    }
    get flightDepartureTime()
    {
        return this.#departureTime;
    }
    get flightArrivalTime()
    {
        return this.#arrivalTime;
    }
    get flightPrice()
    {
        return this.#price;
    }
    get flightAvailable()
    {
        return this.#available;
    }
    set airline(value) 
    {
        this.#airline = value; 
    }
    set flightNumber(value) 
    { 
        this.#flightNumber = value; 
    }
    set departureCity(value)
    { 
        this.#departureCity = value; 
    }
    set arrivalCity(value) 
    { 
        this.#arrivalCity = value; 
    }
    set departureTime(value) 
    {
        this.#departureTime = new Date(value); 
    }
    set arrivalTime(value) 
    { 
        this.#arrivalTime = new Date(value); 
    }
    set price(value) 
    { 
        this.#price = value; 
    }
    set isAvailable(value)
    { 
        this.#available = value;
    }
    addImage(image)
    {
        if(!(image instanceof FlightImage))
        {
            throw new Error("image must be an instance of FlightImage");
        }
        this.#images.push(image);
    }
    addReview(review)
    {
        if(!(review instanceof Reviews)) throw new Error("review must be an instance of Reviews");
        this.#reviews.push(review);
    }
    getAverageRating()
    {
        if(this.#reviews.length === 0) return null;
        const sum = this.#reviews.reduce((s, r) => s + r.rating, 0);
        return (sum / this.#reviews.length).toFixed(1);
    }
}