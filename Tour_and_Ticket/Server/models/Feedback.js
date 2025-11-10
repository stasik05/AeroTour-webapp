class Feedback
{
  #feedbackId;
  #user;
  #manager;
  #message;
  #response;
  #createdAt;
  constructor(id=null,user,manager = null,message,response = null,createdAt = new Date())
  {
    if(!(user instanceof User))
    {
      throw new Error("user must be an instance of User");
    }
    if(manager && !(manager instanceof User))
    {
      throw new Error("manager must be an instance of User");
    }
    if (!message || typeof message !== "string")
    {
      throw new Error("message is required and must be a string");
    }
    this.#feedbackId = id;
    this.#user = user;
    this.#manager = manager;
    this.#message = message.trim();
    this.#response = response?.trim()||null;
    this.#createdAt = new Date(createdAt);
  }
  get feedbackId(){return this.#feedbackId;}
  get user(){return this.#user;}
  get manager(){return this.#manager;}
  get message(){return this.#message;}
  get response(){return this.#response;}
  get createdAt(){return this.#createdAt;}
  set manager(manager)
  {
    if(manager&&!(manager instanceof User))
    {
      throw new Error("manager must be an instance of User or null");
    }
    this.#manager = manager;
  }
  set response(text)
  {
    this.#response = text?.trim()||null;
  }
  hasResponse()
  {
    return !!this.#response;
  }
}