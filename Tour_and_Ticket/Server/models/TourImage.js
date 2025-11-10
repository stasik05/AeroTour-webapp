class TourImage
{
    #id;
    #tour;
    #imageUrl;
    #sortOrder;
    constructor(id=null,tour,imageUrl,sortOrder = 0)
    {
        this.#id = id;
        if(!(tour instanceof Tour))
        {
            throw new Error("Тур должен указывать на класс Тур");
        }
        this.#tour = tour;
        this.#imageUrl = String(imageUrl);
        this.#sortOrder = Number(sortOrder);
        tour.addImage(this);
    }
    get imageId() { return this.#id; }
    get tour() { return this.#tour; }
    get imageUrl() { return this.#imageUrl; }
    get sortOrder() { return this.#sortOrder; }
    set imageUrl(url) { this.#imageUrl = String(url); }
    set sortOrder(order) { this.#sortOrder = Number(order); }

}