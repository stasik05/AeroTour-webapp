class BookingHistory
{
    #bookingHistoryId;
    #booking;
    #bookingHistoryStatus;
    #bookingHistoryChangedAt;
    constructor(bookingId = null,booking,status,changedAt = new Date())
    {
        this.#bookingHistoryId = bookingId;
        if (!(booking instanceof Booking)) {
            throw new Error("booking must be an instance of Booking");
        }
        this.#booking = booking;
        const validStatuses = ['Активно', 'Отменено', 'Завершено'];
        if (!validStatuses.includes(status))
        {
            throw new Error(`Invalid status: ${status}`);
        }
        this.bookingHistoryStatus = status;
        this.#bookingHistoryChangedAt = new Date(changedAt);
        booking.addHistory(this);
    }
    get bookingHistoryId()
    {
        return this.#bookingHistoryId;
    }
    get booking()
    {
        return this.#booking;
    }
    get bookingHistoryStatus()
    {
        return this.#bookingHistoryStatus;
    }
    get bookingHistoryChangedAt()
    {
        return this.#bookingHistoryChangedAt;
    }
}