const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.use('/upload/tours', express.static(path.join(__dirname, '/public/uploads/tours')));
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
app.use('/api/tours',require('./Server/routes/tourManagerRoutes'));
app.use('/api/flights',require('./Server/routes/flightManagerRoutes'));
app.use('/api/bookings',require('./Server/routes/bookingManagerRoutes'));
app.use('/api/discount',require('./Server/routes/discountsRoutes'));
app.use('/api/manager-support', require('./Server/routes/managerSupportRoutes'));
app.use('/api/support', require('./Server/routes/clientSupportRoutes'));
app.use('/api/admin/users', require('./Server/routes/usersRoutes'));
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
app.get('/client/support', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/client/technicalClientSupport.html'));
});
app.get('/password-reset',(req,res)=>
{
  res.sendFile(path.join(__dirname, 'public/quest/PasswordReset.html'));
})
app.get('/manager/main-menu',(req,res)=>
{
  res.sendFile(path.join(__dirname, 'public/manager/MainManagerMenu.html'));
})
app.get('/manager/main-menu/tours',(req,res)=>
{
  res.sendFile(path.join(__dirname, 'public/manager/TourMenu.html'));
});
app.get('/manager/main-menu/flights',(req,res)=>
{
  res.sendFile(path.join(__dirname, 'public/manager/FlightMenu.html'));
});
app.get('/manager/main-menu/tours/add', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/AddTour.html'));
});
app.get('/manager/main-menu/tours/edit', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/EditTour.html'));
});

app.get('/manager/main-menu/tours/delete', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/DeleteTour.html'));
});

app.get('/manager/main-menu/tours/view', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/ViewTour.html'));
});
app.get('/manager/main-menu/flights/add', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/AddFlight.html'));
});
app.get('/manager/main-menu/flights/edit', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/EditFlight.html'));
});

app.get('/manager/main-menu/flights/delete', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/DeleteFlight.html'));
});

app.get('/manager/main-menu/flights/view', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/ViewFlight.html'));
});
app.get('/manager/main-menu/bookings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/BookingsMenu.html'));
});
app.get('/manager/main-menu/bookings/booking-management',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/BookingManagement.html'));
});
app.get('/manager/main-menu/bookings/bookings-statistics',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/BookingStatistics.html'))
});
app.get('/manager/main-menu/discount',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/DiscountsMenu.html'))
});
app.get('/manager/main-menu/discount/sales',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/SalesMenu.html'))
});
app.get('/manager/main-menu/discount/sales/add',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/AddSale.html'))
});
app.get('/manager/main-menu/discount/sales/view',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/ViewSale.html'))
});
app.get('/manager/main-menu/discount/sales/edit',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/EditSale.html'))
});
app.get('/manager/main-menu/discount/sales/delete',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/DeleteSale.html'))
});
app.get('/manager/main-menu/discount/personalized-offers',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/PersonalizedOffersMenu.html'))
});
app.get('/manager/main-menu/discount/personalized-offers/add',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/AddPersonalizedOffer.html'))
});
app.get('/manager/main-menu/discount/personalized-offers/edit',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/EditPersonalizedOffers.html'))
});
app.get('/manager/main-menu/discount/personalized-offers/delete',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/DeletePersonalizedOffers.html'))
});
app.get('/manager/main-menu/discount/personalized-offers/view',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/ViewPersonalizeOffers.html'))
});
app.get('/manager/main-menu/manager-support',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/ManagerSupportPage.html'))
});
app.get('/manager/main-menu/manager-support',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/ManagerSupportPage.html'))
});
app.get('/manager/main-menu/profile',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager/ManagerPersonalAccount.html'))
});
app.get('/admin/main-menu',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/MainAdminMenu.html'))
});
app.get('/admin/main-menu/users',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/AdminUsersMenu.html'))
});
app.get('/admin/main-menu/users/add',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/AddUser.html'))
});
app.get('/admin/main-menu/users/edit',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/EditUser.html'))
});
app.get('/admin/main-menu/users/delete',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/DeleteUser.html'))
});
app.get('/admin/main-menu/users/view',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/ViewUser.html'))
});
app.get('/admin/main-menu/profile',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/AdminPersonalAccount.html'))
});



app.use('/shared', express.static(path.join(__dirname, 'shared')));
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Database: ${process.env.DB_DATABASE || 'tours_and_airtickets'}`);
  console.log(`Server running at http://localhost:${PORT}/login`);
});
