# Event Inventory Management System

A web-based inventory management app for organizations running educational and robotics events. It helps employers plan events, reserve equipment, assign employees, and track checkout or return activity without relying on spreadsheets.

## Features

- Employer and employee login flows with separate permissions.
- Create events with event ID, location, date range, staff in charge, and required equipment.
- Reserve inventory and prevent double-booking during overlapping event dates.
- Track exact equipment IDs for items such as laptops, iPads, VEX IQ kits, and UARO kits.
- Employee task notifications for assigned events.
- Employer notifications after an employee marks equipment as checked out and ready.
- Editable inventory totals, damaged counts, and missing counts.
- Add new inventory types for future equipment needs.
- Delete events and manage users from the employer dashboard.
- Packing lists, return tracking, audit logs, and simple dashboard metrics.
- Browser-local persistence using `localStorage` for real-life prototype testing.

## Demo Accounts

Use these accounts after starting the app:

| Portal | Account | Password |
| --- | --- | --- |
| Employer | Grace Wong | `employer123` |
| Employee | Ben Lim | `employee123` |
| Employee | Aisha Tan | `inventory123` |

New employer and employee accounts can also be created from the login screen.

## Tech Stack

- React
- TypeScript
- Vite
- Lucide React icons
- ESLint

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open the local URL shown in the terminal, usually:

```text
http://127.0.0.1:5173/
```

## Available Scripts

```bash
npm run dev
```

Starts the Vite development server.

```bash
npm run build
```

Builds the production version of the app.

```bash
npm run lint
```

Runs ESLint checks.

```bash
npm run preview
```

Previews the production build locally.

## Notes

This is currently a frontend prototype. Data is saved in the browser using `localStorage`, so it is useful for real-life testing on one device but is not yet connected to a shared database or backend authentication system.

For production use, the next steps would be:

- Add a backend API and database.
- Replace demo passwords with secure authentication.
- Add role-based server permissions.
- Add multi-device real-time inventory updates.
- Add exportable reports for packing lists, inventory history, and shortages.
