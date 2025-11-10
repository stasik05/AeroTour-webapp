class PersonalizeOffer
{
  #personalizeOfferId;
  #user;
  #tour;
  #flight;
  #discountPercent;
  #validUntil;
  constructor(id=null,user,tour=null,flight=null,discountPercent=0.0,validUntil=null)
  {
    this.#personalizeOfferId=id;
    if(!(user instanceof User)) throw new Error("user must be an instance of User");
    this.#user = user;
    if (tour && !(tour instanceof Tour))
    {
      throw new Error("tour must be an instance of Tour or null");
    }
    this.#tour = tour;
    if (flight && !(flight instanceof Flight))
    {
      throw new Error("flight must be an instance of Flight or null");
    }
    this.#flight = flight;
    this.#discountPercent = discountPercent;
    this.#validUntil = validUntil ? new Date(validUntil) : null;
  }
  get offerId(){return this.#personalizeOfferId;}
  get flight(){return this.#flight;}
  get user(){return this.#user;}
  get tour(){return this.#tour;}
  get discountPercent(){return this.#discountPercent;}
  get validUntil(){return this.#validUntil;}
  isValid() {
    if (!this.#validUntil) return true; // бессрочное
    return new Date() <= this.#validUntil;
  }

}