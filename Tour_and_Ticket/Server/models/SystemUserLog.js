class SystemUserLog
{
  #systemUserLogId;
  #admin;
  #action;
  #createdAt;
  constructor(id=null,admin,action = "",createdAt = new Date())
  {
    if(!(admin instanceof User))
    {
      throw new Error("admin must be an instance of User");
    }
    if (admin.roleName?.toLowerCase() !== "admin") {
      throw new Error("Only users with role 'Admin' can create system logs");
    }
    this.#systemUserLogId = id;
    this.#admin = admin;
    this.#action = action.trim();
    this.#createdAt = new Date(createdAt);
  }
  get logId(){return this.#systemUserLogId;}
  get admin_(){return this.#admin;}
  get action(){return this.#action;}
  get createdAt(){return this.#createdAt;}
}