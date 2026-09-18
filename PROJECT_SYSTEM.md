# Smart Shuttle Management System — System Architecture & Page Connection Guide

This document provides a comprehensive overview of the **Smart Shuttle Management System**, explaining its multi-role architecture, frontend routing structure, page interconnections, real-time WebSocket communication, backend service interactions, and data models.

---

## 1. High-Level Architecture Overview

The system follows a modern decoupled **Client-Server Architecture** with real-time bidirectional WebSocket communication.

```mermaid
graph TD
    subgraph Frontend [React 18 + Vite + TailwindCSS]
        UI[React Router Single Page App]
        Zustand[Zustand Auth Store]
        Axios[Axios API Client + Interceptors]
        SocketClient[Socket.IO Client]
        Leaflet[Leaflet + OpenStreetMap UI]
    end

    subgraph Backend [Node.js + Express + TypeScript]
        Express[Express Router & Middlewares]
        AuthMW[JWT Auth & RBAC Middleware]
        Services[Business Logic Services]
        SocketServer[Socket.IO Gateway & Rooms]
        Prisma[Prisma ORM]
    end

    subgraph External [External Services - Free Stack]
        Nominatim[OSM Nominatim Geocoding]
        OSRM[OSRM Route Engine]
    end

    subgraph Storage [Database]
        DB[(PostgreSQL / SQLite Database)]
    end

    UI --> Zustand
    UI --> Axios
    UI --> SocketClient
    UI --> Leaflet

    Axios -- HTTP REST API --> Express
    SocketClient -- WebSockets (WSS/WS) --> SocketServer
    Leaflet -- Geocoding / Routing --> Nominatim
    Leaflet -- Geocoding / Routing --> OSRM

    Express --> AuthMW
    AuthMW --> Services
    Services --> Prisma
    SocketServer --> Services
    Prisma --> DB
```

### Core Technologies
- **Frontend**: React 18, Vite, TypeScript, TailwindCSS, Lucide Icons, Leaflet / React-Leaflet, Zustand (State), Axios, HTML5 QR Code Scanner.
- **Backend**: Node.js, Express.js, TypeScript, Socket.IO, Prisma ORM, Bcrypt, JsonWebToken.
- **Mapping & Routing (100% Free)**: Leaflet + OpenStreetMap + Nominatim (Geocoding) + OSRM (Routing). No Google Maps API key required.
- **Database**: PostgreSQL / SQLite managed by Prisma ORM.

---

## 2. User Roles & Access Control Matrix (RBAC)

The application has **4 distinct user roles**:

| Role | Access Level | Description | Primary Portal Route |
| :--- | :--- | :--- | :--- |
| `SUPER_ADMIN` | Full System Access | System owner with total access to all modules, reports, users, events, and shuttles. | `/admin/dashboard` |
| `ORGANIZER` | Event Manager | Manages events, pickup points, shuttle routes, driver assignments, and monitors live shuttles. | `/admin/dashboard` |
| `DRIVER` | Shuttle Operator | Operates assigned shuttles, broadcasts real-time GPS locations, updates trip status, and scans participant QR codes. | `/driver/dashboard` |
| `EMPLOYEE` / `PARTICIPANT` | Event Passenger | Browses events, books shuttle pickup points, views digital QR tickets, and tracks live shuttle location in real time. | `/participant/dashboard` |

---

## 3. Comprehensive Page Connection & Route Map

Below is the complete map of how all routes and pages in `App.tsx` connect, protected by `PrivateRoute` (role-based) and `PublicRoute` (unauthenticated).

```mermaid
graph TD
    Root["/ (Landing / Direct Router)"] --> RoleCheck{"Role / Auth Check"}

    %% Auth Pages
    subgraph AuthPortal ["Authentication Pages (/auth)"]
        Login["/login"]
        Register["/register"]
        ForgotPass["/forgot-password"]
        ResetPass["/reset-password"]
        VerifyEmail["/verify-email/:token"]
    end

    RoleCheck -- Not Authenticated --> Login

    %% Role Dashboard Router
    RoleCheck -- Authenticated --> RouterIndex["/dashboard (Role Router)"]

    RouterIndex -- SUPER_ADMIN / ORGANIZER --> AdminDash["/admin/dashboard"]
    RouterIndex -- DRIVER --> DriverDash["/driver/dashboard"]
    RouterIndex -- EMPLOYEE / PARTICIPANT --> PartDash["/participant/dashboard"]

    %% Admin Portal
    subgraph AdminPortal ["Admin & Organizer Portal (/admin/*)"]
        AdminDash --> AdminUsers["/admin/users"]
        AdminDash --> AdminEvents["/admin/events"]
        AdminDash --> AdminDrivers["/admin/drivers"]
        AdminDash --> AdminVehicles["/admin/vehicles"]
        AdminDash --> AdminRoutes["/admin/routes"]
        AdminDash --> AdminPickups["/admin/pickup-points"]
        AdminDash --> AdminReservations["/admin/reservations"]
        AdminDash --> AdminTrips["/admin/trips"]
        AdminDash --> AdminActiveShuttles["/admin/active-shuttles"]
        AdminDash --> AdminReports["/admin/reports"]

        AdminTrips --> AdminReplay["/admin/trips/replay/:tripId"]
    end

    %% Driver Portal
    subgraph DriverPortal ["Driver Portal (/driver/*)"]
        DriverDash --> DriverTrips["/driver/trips"]
        DriverDash --> DriverTracking["/driver/tracking"]
        DriverDash --> DriverScanQR["/driver/scan-qr"]
    end

    %% Participant Portal
    subgraph ParticipantPortal ["Participant / Employee Portal (/participant/*)"]
        PartDash --> PartBookings["/participant/bookings"]
        PartDash --> PartTickets["/participant/tickets"]
        PartDash --> PartTrack["/participant/track/:tripId"]
    end

    %% Shared Portal
    subgraph SharedPortal ["Shared Pages"]
        TicketDetails["/ticket/:id"]
        UserProfile["/profile"]
        ForbiddenPage["/403 (Forbidden)"]
        NotFoundPage["* (404 Not Found)"]
    end

    PartTickets --> TicketDetails
    DriverScanQR -- Validates Scan --> TicketDetails
    AdminReservations --> TicketDetails
```

---

## 4. Page Interconnection & User Flow Details

### 4.1 Authentication & Onboarding Flow
1. **Unauthenticated User** visits `/` $\rightarrow$ Redirected to `/login`.
2. **Login (`/login`)**: Validates credentials via `authApi.login()`. Saves JWT tokens (`accessToken` & `refreshToken`) in local storage and updates `useAuthStore`. Redirects to `/dashboard`.
3. **Register (`/register`)**: Creates new participant profile $\rightarrow$ triggers verification email link `/verify-email/:token`.
4. **Password Recovery**: `/forgot-password` sends password reset email link $\rightarrow$ `/reset-password` updates password.

---

### 4.2 Admin & Organizer Flow (`/admin/*`)
The Admin portal allows organizers to configure shuttle logistics from end-to-end:

```mermaid
flowchart LR
    A[1. Create Event] --> B[2. Define Pickup Points & Routes]
    B --> C[3. Register Drivers & Vehicles]
    C --> D[4. Schedule Trips]
    D --> E[5. Monitor Live Shuttles]
    E --> F[6. Replay Trips & View Analytics]
```

- **Dashboard (`/admin/dashboard`)**: Displays total metrics (Events, Participants, Drivers, Vehicles, Active Trips, Reservations) and upcoming events.
- **Events (`/admin/events`)**: Manage event schedules, addresses, capacities, and poster images.
- **Pickup Points (`/admin/pickup-points`)**: Define geographical pickup locations (lat/lng) with max capacity for each event.
- **Routes (`/admin/routes`)**: Define origin, destination, and intermediate stops. Uses OSRM to calculate route path, distance, and duration.
- **Vehicles & Drivers (`/admin/vehicles`, `/admin/drivers`)**: Manage fleet buses and driver assignments.
- **Trips (`/admin/trips`)**: Connects an **Event + Route + Vehicle + Driver + Date/Time**.
- **Live Active Shuttles (`/admin/active-shuttles`)**: Real-time Leaflet map rendering all active shuttles simultaneously.
- **Trip Replay (`/admin/trips/replay/:tripId`)**: Step-by-step historic playback of GPS logs, speed, and stops for completed trips.
- **Reports & Analytics (`/admin/reports`)**: Daily/Weekly/Monthly metrics, vehicle occupancy rates, driver ratings, and route analytics charts.

---

### 4.3 Driver Flow (`/driver/*`)
Designed for mobile-friendly operation by bus drivers on the road:

```mermaid
flowchart TD
    DriverLogin["Driver Logs In"] --> DriverDash["Driver Dashboard (/driver/dashboard)"]
    DriverDash --> ActiveTripCheck{"Active Trip Today?"}
    
    ActiveTripCheck -- Yes --> TrackingPage["Live Tracking (/driver/tracking)"]
    ActiveTripCheck -- Scan Tickets --> ScanQR["QR Code Scanner (/driver/scan-qr)"]

    TrackingPage --> StartTrip["1. Click 'Start Trip' (Status: IN_PROGRESS)"]
    StartTrip --> BroadcastGPS["2. Browser Geolocation broadcasts 'gps-update' via Socket.IO"]
    BroadcastGPS --> NearCheck["3. Auto proximity check (300m) notifies passengers"]
    NearCheck --> CompleteTrip["4. Click 'Complete Trip' (Status: COMPLETED)"]

    ScanQR --> CameraFeed["Scan Passenger Ticket QR"]
    CameraFeed --> ValidateAPI["Call reservationsApi.validateQR()"]
    ValidateAPI -- Valid --> CheckInSuccess["Mark Status: CHECKED_IN"]
```

---

### 4.4 Participant / Employee Flow (`/participant/*`)
Designed for smooth event shuttle booking and passenger experience:

```mermaid
flowchart TD
    PartDash["Participant Dashboard (/participant/dashboard)"] --> BookCTA["Book Shuttle Button"]
    BookCTA --> BookingsPage["Bookings Page (/participant/bookings)"]
    
    BookingsPage --> SelectEvent["1. Select Event"]
    SelectEvent --> SelectPickup["2. Choose Pickup Point & Route"]
    SelectPickup --> ConfirmBook["3. Create Reservation"]

    ConfirmBook --> MyTickets["My Tickets Page (/participant/tickets)"]
    MyTickets --> TicketView["Ticket Details (/ticket/:id)"]
    TicketView --> QRDisplay["Render Digital Ticket & QR Code (JWT signed)"]

    MyTickets -- Shuttle En Route --> TrackPage["Live Shuttle Tracker (/participant/track/:tripId)"]
    TrackPage --> RealtimeMap["Interactive Leaflet Map with Live Shuttle Icon, ETA, Speed, & Progress"]
```

---

## 5. Real-Time WebSockets Engine (`Socket.IO`)

Real-time location tracking and instant notifications are handled by Socket.IO rooms.

```mermaid
sequenceDiagram
    autonumber
    actor Driver as Driver App (/driver/tracking)
    participant Socket as Socket.IO Server
    participant DB as Prisma Database
    actor Passenger as Passenger App (/participant/track)

    Passenger->>Socket: join-trip (tripId)
    Note over Passenger,Socket: Passenger joins Room "trip:tripId"

    loop Every 3-5 seconds
        Driver->>Socket: gps-update { tripId, lat, lng, speed, heading }
        Socket->>DB: Save TrackingLog & Update Vehicle/Trip Position
        Socket->>Socket: Calculate ETA, Distance, & Proximity (300m)
        Socket-->>Driver: gps-ack { tripId, eta, distance, progress }
        Socket-->>Passenger: location-update { tripId, lat, lng, speed, eta, progress }
    end

    opt Shuttle <= 300m from Pickup Point
        Socket-->>Passenger: shuttle-near notification (Room "user:userId")
    end

    Driver->>Socket: trip-status-change { tripId, status: "COMPLETED" }
    Socket-->>Passenger: trip-status-changed { tripId, status: "COMPLETED" }
```

### WebSocket Socket Event Matrix

| Event Name | Direction | Payload | Room / Recipient | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `join-trip` | Client $\rightarrow$ Server | `tripId: string` | `trip:<tripId>` | Joins trip room for live tracking updates. |
| `leave-trip` | Client $\rightarrow$ Server | `tripId: string` | `trip:<tripId>` | Leaves trip tracking room. |
| `gps-update` | Driver $\rightarrow$ Server | `{ tripId, lat, lng, speed, heading }` | Server | Sends current vehicle coordinates from driver device. |
| `gps-ack` | Server $\rightarrow$ Driver | `{ tripId, eta, distance, progress, timestamp }` | Driver Socket | Acknowledges GPS log receipt with calculated ETA. |
| `location-update` | Server $\rightarrow$ Clients | `{ tripId, lat, lng, speed, estimatedArrival, progress }` | Room `trip:<tripId>` | Broadcasts smooth live vehicle marker movement to tracking maps. |
| `trip-status-change` | Driver $\rightarrow$ Server | `{ tripId, status }` | Server | Transitions trip status (SCHEDULED $\rightarrow$ IN_PROGRESS $\rightarrow$ COMPLETED / DELAYED). |
| `trip-status-changed` | Server $\rightarrow$ Clients | `{ tripId, status, label }` | Room `trip:<tripId>` | Notifies passengers of trip status updates. |
| `shuttle-near` | Server $\rightarrow$ Client | `{ pickupPoint, distance, tripId }` | Room `user:<userId>` | Alert sent when shuttle is within 300m of passenger pickup. |

---

## 6. Entity Data Model & Relationships

```mermaid
erDiagram
    USER ||--o{ RESERVATION : "books"
    USER ||--o| DRIVER : "has driver profile"
    DRIVER ||--o| VEHICLE : "assigned to"
    DRIVER ||--o{ TRIP : "drives"
    VEHICLE ||--o{ TRIP : "used in"
    EVENT ||--o{ PICKUP_POINT : "contains"
    EVENT ||--o{ ROUTE : "has"
    EVENT ||--o{ RESERVATION : "hosts"
    ROUTE ||--o{ ROUTE_STOP : "has stops"
    ROUTE ||--o{ TRIP : "defines path for"
    PICKUP_POINT ||--o{ RESERVATION : "assigned to"
    TRIP ||--o{ RESERVATION : "carries passengers"
    TRIP ||--o{ TRACKING_LOG : "generates GPS logs"

    USER {
        string id PK
        string email
        string firstName
        string lastName
        Role role
        string status
    }

    EVENT {
        string id PK
        string name
        dateTime date
        string address
        int capacity
    }

    VEHICLE {
        string id PK
        string busNumber
        string plateNumber
        int capacity
        float currentLat
        float currentLng
    }

    DRIVER {
        string id PK
        string licenseNumber
        boolean availability
        float rating
    }

    ROUTE {
        string id PK
        string origin
        string destination
        float distance
        int estimatedDuration
    }

    PICKUP_POINT {
        string id PK
        string name
        float latitude
        float longitude
        int maxCapacity
    }

    TRIP {
        string id PK
        string status
        dateTime date
        string departureTime
        float tripProgress
    }

    RESERVATION {
        string id PK
        string reservationCode
        string status
        string qrCode
    }

    TRACKING_LOG {
        string id PK
        float latitude
        float longitude
        float speed
        dateTime timestamp
    }
```

---

## 7. Summary Table of Frontend Pages & API Service Mappings

| Frontend Route | React Component | Access Roles | Connected API / Socket Services |
| :--- | :--- | :--- | :--- |
| `/login` | `Login.tsx` | Public | `authApi.login()` |
| `/register` | `Register.tsx` | Public | `authApi.register()` |
| `/forgot-password` | `ForgotPassword.tsx` | Public | `authApi.forgotPassword()` |
| `/reset-password` | `ResetPassword.tsx` | Public | `authApi.resetPassword()` |
| `/verify-email/:token`| `VerifyEmail.tsx` | Public | `authApi.verifyEmail()` |
| `/admin/dashboard` | `AdminDashboard.tsx` | Admin, Organizer | `dashboardApi.getAdmin()` |
| `/admin/users` | `AdminUsers.tsx` | Admin | `usersApi.*` |
| `/admin/events` | `AdminEvents.tsx` | Admin, Organizer | `eventsApi.*` |
| `/admin/drivers` | `AdminDrivers.tsx` | Admin, Organizer | `driversApi.*` |
| `/admin/vehicles` | `AdminVehicles.tsx` | Admin, Organizer | `vehiclesApi.*` |
| `/admin/routes` | `AdminRoutes.tsx` | Admin, Organizer | `routesApi.*`, Nominatim, OSRM |
| `/admin/pickup-points`| `AdminPickupPoints.tsx`| Admin, Organizer | `pickupPointsApi.*` |
| `/admin/reservations` | `AdminReservations.tsx` | Admin, Organizer | `reservationsApi.*` |
| `/admin/trips` | `AdminTrips.tsx` | Admin, Organizer | `tripsApi.*` |
| `/admin/trips/replay/:tripId`| `AdminReplayTrip.tsx`| Admin, Organizer | `trackingApi.replayTrip()` |
| `/admin/active-shuttles`| `AdminActiveShuttles.tsx`| Admin, Organizer | `trackingApi.getOrganizerMonitoring()`, Socket.IO |
| `/admin/reports` | `AdminReports.tsx` | Admin, Organizer | `reportsApi.*` |
| `/driver/dashboard` | `DriverDashboard.tsx` | Driver | `dashboardApi.getDriver()`, `trackingApi.getDriverCurrentTrip()` |
| `/driver/trips` | `DriverTrips.tsx` | Driver | `driversApi.getTodayTrips()` |
| `/driver/tracking` | `DriverTracking.tsx` | Driver | `trackingApi.updateLocation()`, `trackingApi.changeTripStatus()`, Socket.IO (`gps-update`) |
| `/driver/scan-qr` | `DriverScanQr.tsx` | Driver | `reservationsApi.validateQR()` |
| `/participant/dashboard`| `ParticipantDashboard.tsx`| Employee/Participant| `dashboardApi.getParticipant()` |
| `/participant/bookings` | `ParticipantBookings.tsx` | Employee/Participant| `eventsApi.getUpcoming()`, `reservationsApi.create()` |
| `/participant/tickets` | `ParticipantMyTickets.tsx`| Employee/Participant| `reservationsApi.getMyReservations()` |
| `/participant/track/:tripId`| `ParticipantTrack.tsx`| Employee/Participant| Socket.IO (`join-trip`, `location-update`), Leaflet Map |
| `/ticket/:id` | `TicketDetails.tsx` | Authenticated | `reservationsApi.getById()` |
| `/profile` | `Profile.tsx` | Authenticated | `authApi.getProfile()`, `authApi.updateProfile()`, `authApi.changePassword()` |

---

*Document generated for developer reference and system architecture review.*
