class AuthService
{
  static async register(userData)
  {
    const response = await fetch('/api/auth/register',
      {
        method: "POST",
        headers:
          {
            'Content-Type': 'application/json',
          },
        body: JSON.stringify(userData)
      });
    const result = await response.json();
    if(!response.ok)
    {
      throw result;
    }
    return result;
  }
  static async login(credentials)
  {
    const response = await fetch('/api/auth/login',
      {
        method: "POST",
        headers:
          {
            'Content-Type': 'application/json',
          },
        body: JSON.stringify(credentials)
      });
    const result = await response.json();
    if(!response.ok)
    {
      throw result;
    }
    return result;
  }
  static logout()
  {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
  static getCurrentUser()
  {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr):null;
  }
  static isAuthenticated()
  {
    return !!localStorage.getItem('token');
  }
  static getToken() {
    return localStorage.getItem('token');
  }
}
export { AuthService };
