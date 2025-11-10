class Tour
{
    #id;
    #title;
    #description;
    #country;
    #city;
    #startDate;
    #endDate;
    #price;
    #available;
    #images = [];
    #reviews = [];
    constructor(id=null,title,description = '',country = '',city = '',startDate = null,endDate = null,price = 0.0,available = true)
    {
        this.#id = id;
        this.#title = title;
        this.#description = description;
        this.#country = country;
        this.#city = city;
        this.#startDate = startDate ? new Date(startDate):null;
        this.#endDate = endDate ? new Date(endDate):null;
        this.#price = price;
        this.#available = available;
    }
    get tourId()
    {
        return this.#id;
    }
    get tourTitle()
    {
        return this.#title;
    }
    get tourDescription()
    {
        return this.#description;
    }
    get tourCountry()
    {
        return this.#country;
    }
    get tourCity()
    {
        return this.#city;
    }
    get tourStartDate() 
    { 
        return this.#startDate;
    }
    get tourEndDate() 
    {
        return this.#endDate;
    }
    get tourPrice() 
    { 
        return this.#price; 
    }
    get isAvailable() 
    {
        return this.#available; 
    } 
    set tourTitle(title) 
    {
        this.#title = title; 
    }
    set tourDescription(desc)
    {
        this.#description = desc; 
    }
    set tourCountry(country) 
    {
        this.#country = country; 
    }
    set tourCity(city) 
    {
        this.#city = city; 
    }
    set tourStartDate(date) 
    {
        this.#startDate = new Date(date); 
    }
    set tourEndDate(date) 
    { 
        this.#endDate = new Date(date); 
    }
    set tourPrice(price) 
    { 
        this.#price = price; 
    }
    set isAvailable(value) 
    { 
        this.#available = value; 
    }
    addImage(image) 
    {
        if (!(image instanceof TourImage)) 
        {
            throw new Error("image must be an instance of TourImage");
        }
        this.#images.push(image);
    }
    addReview(review)
    {
        if(!(review instanceof Reviews))
        {
            throw new Error("Invalid review");
        }
        this.#reviews.push(review);
    }
    getAverageRating()
    {
        if (this.#reviews.length === 0) return null;
        const sum = this.#reviews.reduce((s, r) => s + r.rating, 0);
        return (sum / this.#reviews.length).toFixed(1);
    }
    
}