class Booking
{
    #id;
    #user;
    #tour;
    #flight;
    #bookingDate;
    #bookingStatus;
    #history = [];
    constructor(id = null,user,tour=null,flight=null,bookingDate = new Date(),status ="Активно")
    {
        this.#id=id;
        if(!(user instanceof User))
        {
            throw new Error("user must be an instance of User");
        }
        this.#user = user;
        if(tour&&!(tour instanceof Tour))
        {
            throw new Error("tour must be an instance of Tour or null");
        }
        this.#tour = tour;
        if(flight&&!(flight instanceof Flight))
        {
            throw new Error("flight must be an instance of Flight or null");
        }
        this.#flight = flight;
        this.#bookingDate = new Date(bookingDate)
        const validStatuses = ["Активно","Отменено","Завершено"];
        if(!validStatuses.includes(status))
        {
            throw new Error(`Invalid booking status: ${status}`);
        }
        this.#bookingStatus = status;
    }
    get bookingId()
    {
        return this.#id;
    }
    get user()
    {
        return this.#user;
    }
    get tour()
    {
        return this.#tour;
    }
    get flight()
    {
        return this.#flight;
    }
    get bookingDate()
    {
        return this.#bookingDate;
    }
    get bookingStatus()
    {
        return this.#bookingStatus;
    }
    addHistory(historyRecord) 
    {
        if (!(historyRecord instanceof BookingHistory))
        {
            throw new Error("historyRecord must be an instance of BookingHistory");
        }
        this.#history.push(historyRecord);
    }
}