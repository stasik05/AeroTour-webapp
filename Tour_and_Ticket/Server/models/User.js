const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const Role = require('./Role');
class User {
    #id;
    #role;
    #name;
    #lastName;
    #email;
    #password;
    #phone;
    #createdAt;
    #photo;
    #reviews = [];
    #offers = [];
    #feedbacks = [];
    constructor(id = null, role, name = '', lastName = '', email = '', password = '', phone = null, createdAt = new Date(), photo = null) {
        this.#id = id;
        this.#role = role;
        this.#name = name;
        this.#lastName = lastName;
        this.#email = email;
        this.#password = password;
        this.#phone = phone;
        this.#createdAt = new Date(createdAt);
        this.#photo = photo;
    }
    get userId() { return this.#id; }
    get userName() { return this.#name; }
    get userLastName() { return this.#lastName; }
    get userEmail() { return this.#email; }
    get userPassword() { return this.#password; }
    get userPhone() { return this.#phone; }
    get userCreatedAt() { return this.#createdAt; }
    get userPhoto() { return this.#photo; }
    get role() { return this.#role; }
    set role(role) {
        if (!(role instanceof Role)) {
            throw new Error("role must be an instance of Role");
        }
        this.#role = role;
    }
    set userName(name) {
        this.#name = name;
    }
    set userLastName(lastName) {
        this.#lastName = lastName;
    }
    set userEmail(email) { this.#email = email; }
    set userPassword(password) { this.#password = password; }
    set userPhone(phone) { this.#phone = phone; }
    set userCreatedAt(date) { this.#createdAt = new Date(date); }
    set userPhoto(photo) { this.#photo = photo; }
    addReview(review) {
        if (!(review instanceof Reviews)) throw new Error("Invalid review");
        this.#reviews.push(review);
    }
    getReviews() {
        return this.#reviews;
    }
    addOffer(offer) {
        if (!(offer instanceof PersonalizeOffer)) throw new Error("Invalid offer");
        this.#offers.push(offer);
    }
    getOffers() {
        return this.#offers.filter(o => o.isValid());
    }
    addFeedback(feedback) {
        if (!(feedback instanceof Feedback)) throw new Error("Invalid feedback");
        this.#feedbacks.push(feedback);
    }
    getFeedbacks() {
        return this.#feedbacks;
    }
    respondTo(feedback, text) {
        if (!(feedback instanceof Feedback)) throw new Error("Invalid feedback");
        feedback.manager = this;
        feedback.response = text;
    }
    static async findByEmail(email) {
        try {
            const [rows] = await pool.execute(
              `SELECT u.*, r.name as role_name
                 FROM users u 
                 LEFT JOIN roles r ON u.role_id = r.id
                 WHERE u.email = ?`,
              [email]
            );
            if (rows.length === 0) return null;
            const userData = rows[0];
            const role = new Role(userData.role_id, userData.role_name);

            return new User(
              userData.id,
              role,
              userData.name,
              userData.last_name,
              userData.email,
              userData.password,
              userData.phone,
              userData.created_at,
              userData.photo
            );
        }
        catch(error)
        {
            throw new Error(`Ошибка при поиске пользователя: ${error.message}`);
        }
    }
    static async findAll()
    {
        try
        {
            const [rows] = await pool.execute
            (
              `SELECT u.*, r.name as role_name
              FROM users u 
              LEFT JOIN roles r ON u.role_id = r.id
              ORDER BY u.created_at DESC`
            );
            return rows.map(userData => {
                const role = new Role(userData.role_id, userData.role_name);
                return new User(
                  userData.id,
                  role,
                  userData.name,
                  userData.last_name,
                  userData.email,
                  userData.password,
                  userData.phone,
                  userData.created_at,
                  userData.photo
                );
            });
        }
        catch (error)
        {
            throw new Error(`Ошибка при получении пользователей: ${error.message}`);
        }
    }
    static async deleteById(id)
    {
        try
        {
            const [result] = await pool.execute
            (
              `DELETE FROM users WHERE id = ?`,
              [id]
            );
            if (result.affectedRows === 0) {
                throw new Error('Пользователь не найден');
            }
            return true;
        }
        catch (error) {
            throw new Error(`Ошибка при удалении пользователя: ${error.message}`);
        }
    }
    static async findByRole(roleName) {
        try {
            const [rows] = await pool.execute(
              `SELECT u.*, r.name as role_name
               FROM users u
                        LEFT JOIN roles r ON u.role_id = r.id
               WHERE r.name = ?
               ORDER BY u.created_at DESC`,
              [roleName]
            );

            return rows.map(userData => {
                const role = new Role(userData.role_id, userData.role_name);
                return new User(
                  userData.id,
                  role,
                  userData.name,
                  userData.last_name,
                  userData.email,
                  userData.password,
                  userData.phone,
                  userData.created_at,
                  userData.photo
                );
            });
        } catch (error) {
            throw new Error(`Ошибка при поиске пользователей по роли: ${error.message}`);
        }
    }
    static async create(userData)
    {
        try
        {
            const { name, lastName, email, password, phone, role = 'client' } = userData;
            if (!name || !lastName || !email || !password) {
                throw new Error('Все обязательные поля должны быть заполнены');
            }
            const hashedPassword = await bcrypt.hash(password, 12);
            const [roleRows] = await pool.execute
            (
              'SELECT id FROM roles WHERE name = ?',
              [role]
            );
            if (roleRows.length === 0)
            {
                throw new Error(`Роль '${role}' не найдена`);
            }
            const roleId = roleRows[0].id;
            const phoneValue = phone || null;
            const [result] = await pool.execute(
              `INSERT INTO users (role_id, name, last_name, email, password, phone) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
              [roleId, name, lastName, email, hashedPassword, phoneValue]
            );
            const [newUserRows] = await pool.execute(
              `SELECT u.*, r.name as role_name
                 FROM users u 
                 LEFT JOIN roles r ON u.role_id = r.id
                 WHERE u.id = ?`,
              [result.insertId]
            );
            const newUserData = newUserRows[0];
            const userRole = new Role(newUserData.role_id, newUserData.role_name);
            return new User(
              newUserData.id,
              userRole,
              newUserData.name,
              newUserData.last_name,
              newUserData.email,
              newUserData.password,
              newUserData.phone,
              newUserData.created_at,
              newUserData.photo
            );

        }
        catch(error)
        {
            throw new Error(`Ошибка при создании пользователя: ${error.message}`);
        }
    }
    async validatePassword(password)
    {
        return await bcrypt.compare(password, this.userPassword);
    }
    toJSON() {
        return {
            id: this.userId,
            name: this.userName,
            lastName: this.userLastName,
            email: this.userEmail,
            phone: this.userPhone,
            role: this.role ? {
                id: this.role.roleId,
                name: this.role.roleName
            } : null,
            createdAt: this.userCreatedAt,
            photo: this.userPhoto
        };
    }
    static async findById(id)
    {
        try
        {
            const [rows] = await pool.execute(
              `SELECT u.*,r.name as role_name
              FROM users u LEFT JOIN roles r ON u.role_id = r.id
              WHERE u.id = ?`,
              [id]
            );
            if(rows.length===0)
            {
                return null;
            }
            const userData = rows[0];
            const role = new Role(userData.role_id, userData.role_name);

            return new User(
              userData.id,
              role,
              userData.name,
              userData.last_name,
              userData.email,
              userData.password,
              userData.phone,
              userData.created_at,
              userData.photo
            );
        }
        catch(error)
        {
            throw new Error(`Ошибка при поиске пользователя: ${error.message}`);
        }
    }
    async save() {
        try {
            console.log('💾 Сохранение пользователя ID:', this.userId);
            console.log('📝 Данные для сохранения:', {
                name: this.userName,
                lastName: this.userLastName,
                phone: this.userPhone,
                photo: this.userPhoto
            });

            const [result] = await pool.execute(
              `UPDATE users SET name = ?, last_name = ?, phone = ?, photo = ? WHERE id = ?`,
              [this.userName, this.userLastName, this.userPhone, this.userPhoto, this.userId]
            );

            console.log('✅ Результат UPDATE запроса:', {
                affectedRows: result.affectedRows,
                changedRows: result.changedRows
            });

            if (result.affectedRows === 0) {
                throw new Error('Пользователь не найден при обновлении');
            }

            return true;
        } catch (error) {
            console.error('❌ Ошибка при сохранении пользователя:', error);
            console.error('📋 SQL ошибка детали:', error.sqlMessage);
            throw new Error(`Ошибка при сохранении пользователя: ${error.message}`);
        }
    }
    async changePassword(newPassword)
    {
        try
        {
            const hashedPassword = await bcrypt.hash(newPassword,12);
            await pool.execute(
              `UPDATE users SET password = ? WHERE id = ?`,
              [hashedPassword,this.userId]
            );
            this.#password = hashedPassword;
            return true;
        }
        catch(error)
        {
            throw new Error(`Ошибка при смене пароля: ${error.message}`);
        }
    }
}

module.exports = User;