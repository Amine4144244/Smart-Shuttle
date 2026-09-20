import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[\d\s-]{7,15}$/, 'Invalid phone number').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

export const eventSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  latitude: z.coerce.number().min(-90).max(90).optional().or(z.literal('')),
  longitude: z.coerce.number().min(-180).max(180).optional().or(z.literal('')),
  capacity: z.coerce.number().min(1, 'Capacity must be at least 1').max(100000),
  status: z.string().optional(),
}).refine(d => !d.startTime || !d.endTime || new Date(d.startTime) < new Date(d.endTime), {
  message: 'End time must be after start time', path: ['endTime'],
});

export const vehicleSchema = z.object({
  busNumber: z.string().min(2, 'Bus number is required').max(20),
  plateNumber: z.string().min(3, 'Plate number is required').max(20),
  capacity: z.coerce.number().min(1, 'Capacity must be at least 1').max(100),
  model: z.string().max(50).optional().or(z.literal('')),
  year: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number().int().min(2000).max(2030).optional()
  ),
  color: z.string().max(30).optional().or(z.literal('')),
  status: z.string().optional(),
});

export const driverSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().regex(/^\+?[\d\s-]{7,15}$/, 'Invalid phone number'),
  licenseNumber: z.string().min(3, 'License number is required'),
  address: z.string().optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
});

const stopSchema = z.object({
  name: z.string().min(1, 'Stop name is required'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  order: z.coerce.number().int().min(0),
});

export const routeSchema = z.object({
  name: z.string().min(3, 'Name is required'),
  origin: z.string().min(3, 'Origin is required'),
  originLat: z.coerce.number().min(-90).max(90).optional().or(z.literal('')),
  originLng: z.coerce.number().min(-180).max(180).optional().or(z.literal('')),
  destination: z.string().min(3, 'Destination is required'),
  destinationLat: z.coerce.number().min(-90).max(90).optional().or(z.literal('')),
  destinationLng: z.coerce.number().min(-180).max(180).optional().or(z.literal('')),
  distance: z.coerce.number().min(0).optional().or(z.literal('')),
  estimatedDuration: z.coerce.number().int().min(1).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
  isActive: z.boolean().optional(),
  eventId: z.string().min(1, 'Event is required'),
  stops: z.array(stopSchema).optional().default([]),
});

export const pickupPointSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  latitude: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? 0 : Number(v)),
    z.number().min(-90, 'Invalid latitude').max(90, 'Invalid latitude').default(0)
  ),
  longitude: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? 0 : Number(v)),
    z.number().min(-180, 'Invalid longitude').max(180, 'Invalid longitude').default(0)
  ),
  address: z.string().max(200).optional().or(z.literal('')),
  maxCapacity: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? 50 : Number(v)),
    z.number().int().min(1, 'Capacity must be at least 1').default(50)
  ),
  eventId: z.string().min(1, 'Event is required'),
});

export const reservationSchema = z.object({
  eventId: z.string().min(1, 'Event is required'),
  pickupPointId: z.string().optional().or(z.literal('')),
  tripId: z.string().optional().or(z.literal('')),
  notes: z.string().max(300).optional().or(z.literal('')),
  passengerCount: z.coerce.number().int().min(1, 'At least 1 passenger').max(20, 'Max 20 passengers'),
  contactPhone: z.string().regex(/^\+?[\d\s-]{7,15}$/, 'Invalid phone number').optional().or(z.literal('')),
  pickupLatitude: z.coerce.number().min(-90).max(90).optional(),
  pickupLongitude: z.coerce.number().min(-180).max(180).optional(),
  pickupAddress: z.string().max(300).optional().or(z.literal('')),
  pickupTime: z.string().optional(),
});

export const userSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().regex(/^\+?[\d\s-]{7,15}$/, 'Invalid phone number').optional().or(z.literal('')),
  role: z.string().min(1, 'Role is required'),
  status: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

export const profileSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  phone: z.string().regex(/^\+?[\d\s-]{7,15}$/, 'Invalid phone number').optional().or(z.literal('')),
});

export const tripSchema = z.object({
  name: z.string().min(2, 'Name is required').max(100).optional().or(z.literal('')),
  date: z.string().min(1, 'Date is required'),
  departureTime: z.string().min(1, 'Departure time is required'),
  driverId: z.string().min(1, 'Driver is required'),
  vehicleId: z.string().min(1, 'Vehicle is required'),
  routeId: z.string().min(1, 'Route is required'),
  notes: z.string().max(500).optional().or(z.literal('')),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type EventFormData = z.infer<typeof eventSchema>;
export type VehicleFormData = z.infer<typeof vehicleSchema>;
export type DriverFormData = z.infer<typeof driverSchema>;
export type RouteFormData = z.infer<typeof routeSchema>;
export type PickupPointFormData = z.infer<typeof pickupPointSchema>;
export type ReservationFormData = z.infer<typeof reservationSchema>;
export type UserFormData = z.infer<typeof userSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type TripFormData = z.infer<typeof tripSchema>;
