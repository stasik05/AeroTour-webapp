import Flight from './Flight.js';
class FlightImage
{
    #id;
    #flight;
    #imageUrl;
    constructor(id=null,flight,imageUrl)
    {
        this.#id = id;
        if(!(fligth instanceof Flight))
        {
            throw new Error(" Полет должен указывать на класс Полет");
        }
        this.#flight = flight;
        this.#imageUrl = imageUrl;
        flight.addImage(this);
    }
    get imageId()
    {
        return this.#id;
    }
    get flight()
    {
        return this.#flight;
    }
    get imageUrl()
    {
        return this.#imageUrl;
    }
    set imageUrl(url)
    {
        this.#imageUrl = url;
    }
}