const User = require("./User");

class Favorites
{
  #id;
  #user;
  #tour;
  #flight;
  #added_at;
  constructor(id = null,user,tour = null, flight = null,addedAt = new Date())
  {
    this.#id=id;
    if(!(user instanceof User))
    {
      throw new Error("user must be an instance of User");
    }
    this.#user = user;
    if(tour&&!(tour instanceof Tour))
    {
      throw new Error("tour must be an instance of Tour");
    }
    this.#tour = tour;
    if(flight && !(flight instanceof Flight))
    {
      throw new Error("flight must be an instance of Flight or null");
    }
    this.#flight = flight;
    this.#added_at = new Date(addedAt);
  }
  get favoriteId(){return this.#id;}
  get user(){return this.#user;}
  get flight(){return this.#flight;}
  get tour(){return this.#tour;}
  get addedAt() {return this.#added_at;}
  toJSON()
  {
    return {
      id: this.favoriteId,
      user: this.user ? this.user.toJSON() : null,
      tour: this.tour ? this.tour.toJSON() : null,
      flight: this.flight ? this.flight.toJSON() : null,
      added_at: this.addedAt
    };
  }
}
module.exports = Favorites;