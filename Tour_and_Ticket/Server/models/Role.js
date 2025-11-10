class Role
{
    #id;
    #name;
    constructor(id=null,name)
    {
        this.#id = id;
        this.#name = name;
    }
    get roleId()
    {
        return this.#id;
    }
    get roleName()
    {
        return this.#name;
    }
    set roleName(name)
    {
        this.#name = name;
    }
}
module.exports = Role;