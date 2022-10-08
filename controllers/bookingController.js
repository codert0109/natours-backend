const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { CLIENT_BASE_URL } = require('../config/constants');
const Booking = require('../models/bookingModel');
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');

const factory = require('./handlerFactory');

exports.getCurrentUserBookings = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user.id });

  const tourIds = bookings.map(el => el.tour.id);
  const tours = await Tour.find({ _id: { $in: tourIds } });

  res.status(200).json({
    status: 'success',
    tours,
  });
});

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // get currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  // cereate checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${CLIENT_BASE_URL}/my-tours?booking=success`,
    cancel_url: `${CLIENT_BASE_URL}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: tour.price * 100, // convert $ to cents,
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [`${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`],
          },
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
  });

  // send it to the client
  res.status(200).json({
    status: 'success',
    sessionUrl: session.url,
  });
});

const createBookingCheckout = catchAsync(async session => {
  const tour = session.client_reference_id;
  const { id: user } = await User.findOne({ email: session.customer_email });
  // In session we convert the amount to cents so we convert it back to USD
  const price = session.amount_total / 100;

  await Booking.create({ tour, user, price });
});

exports.webhookCheckout = (req, res, next) => {
  const signature = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_CHECKOUT_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') createBookingCheckout(event.data.object);

  res.status(200).json({ received: true });
};

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
