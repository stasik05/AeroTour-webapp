class Discount
{
  #discountId;
  #discountTitle;
  #discountDescription;
  #discountPercent;
  #startDate;
  #endDate;
  constructor(id=null,title,description = '',discountPercent = 0.0,startDate =null,endDate = null)
  {
    this.#discountId = discountPercent;
    if(!title) throw new Error("Discount must have a title");
    this.#discountTitle = title;
    if (typeof discountPercent !== 'number' || discountPercent < 0 || discountPercent > 100) {
      throw new Error("discountPercent must be between 0 and 100");
    }
    this.#discountPercent = discountPercent;
    this.#discountDescription = description;
    this.#startDate = startDate ? new Date(startDate) : null;
    this.#endDate = endDate ? new Date(endDate) : null;
  }
  get discountId(){return this.#discountId;}
  get discountTitle(){return this.#discountTitle;}
  get discountDescription(){return this.#discountDescription;}
  get discountPercent(){return this.#discountPercent;}
  get discountStartDate(){return this.#startDate;}
  get discountEndDate(){return this.#endDate;}
  isActive()
  {
    const now = new Date();
    const afterStart = !this.#startDate||now>=this.#startDate;
    const beforeEnd = !this.#endDate||now<=this.#endDate;
    return afterStart && beforeEnd;
  }
  applyDiscount(price)
  {
    if(typeof price !=='number') throw new Error("price must be a number");
    return + (price*(1-this.#discountPercent/100)).toFixed(2);
  }
}