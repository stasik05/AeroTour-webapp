const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static('D:/Бугор/5 семестр/КП ПиРwebпр/Pictures'));
app.use('/images/users', express.static('../public/uploads'));
app.use('/api/auth',require('./Server/routes/authRoutes'));
app.use('/api/user',require('./Server/routes/profileRoutes'));
app.use('/api/favorites',require('./Server/routes/favoriteRoutes'));
app.use('/api/search',require('./Server/routes/searchRoutes'));
app.use('/api/details',require('./Server/routes/detailsRoutes'));
app.use('/api/calendar',require('./Server/routes/calendarRoutes'));
app.use('/api/password-reset', require('./Server/routes/passwordResetRouter'));
app.get('/api/health', (req, res) => {
  res.json({
    status: '✅ Server is running with DB!',
    timestamp: new Date().toISOString()
  });
});
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/quest/HelloPage.html'));
});
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/quest/Login.html'));
});
app.get('/registration', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/quest/Registration.html'));
});
app.get('/client/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/client/mainClientWindow.html'));
});
app.get('/client/profile',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/client/personalClientAccount.html'));
})
app.get('/client/favorites', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/client/clientFavorites.html'));
});
app.get('/client/search',(req,res)=>
{
  res.sendFile(path.join(__dirname, 'public/client/mainClientWindow.html'));
})
app.get('/client/tour/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/client/DetailsWindow.html'));
});

app.get('/client/flight/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/client/DetailsWindow.html'));
});
app.get('/client/calendar', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/client/clientCalendar.html'));
});

app.get('/client/calendar/bookings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/client/clientCalendar.html'));
});

app.get('/client/calendar/trip/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/client/clientCalendar.html'));
});
app.get('/password-reset',(req,res)=>
{
  res.sendFile(path.join(__dirname, 'public/quest/PasswordReset.html'));
})
app.use('/shared', express.static(path.join(__dirname, 'shared')));
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🗄️ Database: ${process.env.DB_DATABASE || 'tours_and_airtickets'}`);
  console.log(`🔐 Test registration: http://localhost:${PORT}/login`);
  console.log(`🔐 Auth routes: /api/auth/register, /api/auth/login`);
  console.log(`👤 Profile routes: /api/user/profile, /api/user/bookings`);
  console.log(`⭐ Favorites routes: /api/favorites`);
  console.log(`🔐 Test recovery: http://localhost:${PORT}/password-reset`);
});
