import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MassageService, MassageBooking as MassageBookingType } from '../lib/types';
import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';

export const MassageBooking = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<MassageService[]>([]);
  const [bookings, setBookings] = useState<MassageBookingType[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchServices();
    fetchBookings();
  }, [user]);

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from('massage_services')
      .select('*')
      .eq('available', true)
      .order('name');

    if (error) {
      console.error('Error fetching services:', error);
      return;
    }

    setServices(data || []);
  };

  const fetchBookings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('massage_bookings')
      .select(`
        *,
        massage_services (name, duration_minutes)
      `)
      .eq('user_id', user.id)
      .order('booking_date', { ascending: false });

    if (error) {
      console.error('Error fetching bookings:', error);
      return;
    }

    setBookings(data || []);
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const service = services.find(s => s.id === selectedService);
      if (!service) {
        throw new Error('Please select a service');
      }

      const { error } = await supabase.from('massage_bookings').insert({
        user_id: user?.id,
        service_id: selectedService,
        booking_date: bookingDate,
        booking_time: bookingTime,
        price: service.price,
        notes: notes,
        status: 'pending',
      });

      if (error) throw error;

      setSuccess('Booking created successfully! Awaiting confirmation.');
      setSelectedService('');
      setBookingDate('');
      setBookingTime('');
      setNotes('');
      fetchBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-blue-600 bg-blue-50';
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-yellow-600 bg-yellow-50';
    }
  };

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Ayurvedic Massage Booking</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Book Appointment</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                {success}
              </div>
            )}

            <form onSubmit={handleBooking} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Service
                </label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="">Choose a service...</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - {service.duration_minutes}min - ₹{service.price}
                    </option>
                  ))}
                </select>
              </div>

              {selectedService && (
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    {services.find(s => s.id === selectedService)?.description}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date
                </label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  min={minDate}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Time
                </label>
                <input
                  type="time"
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Any special requests or health concerns..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition disabled:bg-gray-400"
              >
                {loading ? 'Booking...' : 'Book Appointment'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Available Services</h2>
            <div className="space-y-3">
              {services.map((service) => (
                <div key={service.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-800">{service.name}</h3>
                    <span className="text-orange-600 font-bold">₹{service.price}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                  <p className="text-xs text-gray-500">Duration: {service.duration_minutes} minutes</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">My Bookings</h2>
            {bookings.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No bookings yet</p>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking: any) => (
                  <div key={booking.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-800">
                        {booking.massage_services?.name}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(booking.booking_date).toLocaleDateString()}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {booking.booking_time}
                      </p>
                      <p className="font-semibold text-orange-600">₹{booking.price}</p>
                      {booking.notes && (
                        <p className="text-xs text-gray-500 mt-2">{booking.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
