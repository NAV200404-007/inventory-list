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
- Shared Supabase persistence for accounts, inventory, events, packing, returns, notifications, and audit history.

## Accounts

No demo accounts are included. Start by creating an employer account from the login screen, then use that employer account to manage users, inventory, and events.

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

This deployment uses Supabase Auth and Postgres. Operational records synchronize across employer and employee devices in real time. Only the visual theme preference remains in browser storage.

For production use, the next steps would be:

- Add a backend API and database.
- Replace browser-only passwords with secure authentication.
- Add role-based server permissions.
- Add multi-device real-time inventory updates.
- Add exportable reports for packing lists, inventory history, and shortages.
