# 🚕 RideEasy – Cloud-Based Cab Booking System

RideEasy is a cloud-based cab booking web application that allows users to book cabs, calculate estimated fares, and view ride status updates. Administrators can manage bookings, assign drivers, and update estimated arrival times.

The project uses Amazon S3 for website hosting and Firebase for authentication and database management.

## ✨ Features

### 👤 User Features
- User registration and login
- Cab booking between supported cities
- Automatic fare estimation
- Personal booking dashboard
- Booking status updates
- View assigned driver name and ETA

### 🛠️ Admin Features
- Dedicated administrator login
- View customer bookings
- Update booking status
- Assign driver names
- Set estimated arrival times
- Manage ride progress

## 🏙️ Supported Cities

- Kopargaon
- Shirdi
- Nashik
- Ahmednagar
- Chhatrapati Sambhajinagar
- Pune
- Mumbai

*Distances are predefined demonstration estimates, not live map calculations.*

## 💰 Demo Fare Calculation

| Cab Type | Base Fare | Rate per km |
|---|---:|---:|
| Mini | ₹50 | ₹12 |
| Sedan | ₹80 | ₹16 |
| SUV | ₹120 | ₹22 |

**Estimated Fare = Base Fare + (Distance × Rate per km)**

These rates are illustrative and are not connected to a real taxi service.

## 🛠️ Technologies Used

**Frontend**
- HTML5
- CSS3
- JavaScript

**Cloud Hosting**
- Amazon S3 Static Website Hosting

**Authentication and Database**
- Firebase Authentication
- Cloud Firestore

## 🏗️ System Architecture

1. Users access the website through the Amazon S3 website endpoint.
2. Firebase Authentication manages user and administrator login.
3. Users submit cab booking requests.
4. Cloud Firestore stores user profiles and booking information.
5. Administrators update booking status, driver details, and ETA.
6. Users view their booking information through the dashboard.

## 🚀 Run the Project Locally

### Prerequisites
- Visual Studio Code
- A modern web browser
- Live Server extension
- A Firebase project

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/YOUR-USERNAME/RideEasy-Cab-Booking-System.git