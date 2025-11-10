class Reviews
{
  #reviewId;
  #user;
  #tour;
  #flight;
  #reviewRating;
  #reviewComment;
  #reviewCreatedAt;
  constructor(id=null,user,tour = null, flight = null,reviewRating = 0.0,reviewComment='',reviewCreatedAt=new Date())
  {
    this.#reviewId = id;
    if(tour && !(tour instanceof Tour))
    {
      throw new Error("tour must be an instance of Tour or null");
    }
    this.#tour = tour;
    if(!(user instanceof User))
    {
      throw new Error("user must be an instance of User");
    }
    this.#user = user;
    if(flight &&!(flight instanceof Flight))
    {
      throw new Error("flight must be an instance of Flight or null");
    }
    this.#flight = flight;
    if (typeof reviewRating !== 'number' || reviewRating < 1 || reviewRating > 5) {
      throw new Error("rating must be a number between 1 and 5");
    }
    this.#reviewRating = reviewRating;
    this.#reviewComment = reviewComment;
    this.#reviewCreatedAt = new Date(reviewCreatedAt);
  }
  get reviewId(){return this.#reviewId;}
  get user(){return this.#user;}
  get tour(){return this.#tour;}
  get flight(){return this.#flight;}
  get reviewRating(){return this.#reviewRating;}
  get reviewComment(){return this.#reviewComment;}
  get reviewCreatedAt(){return this.#reviewCreatedAt;}
  set rating(value) {
    if (typeof value !== 'number' || value < 1 || value > 5) {
      throw new Error("rating must be between 1 and 5");
    }
    this.#reviewRating = value;
  }
  set comment(value) { this.#reviewComment = value; }
}