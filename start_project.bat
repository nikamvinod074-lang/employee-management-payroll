@echo off

start "Backend" cmd /k "cd /d C:\Users\nikam\employee-management-payroll && call .venv\Scripts\activate.bat && cd backend && python manage.py runserver"

timeout /t 5

start "Frontend" cmd /k "cd /d C:\Users\nikam\employee-management-payroll\frontend && npm run dev"

timeout /t 10

start http://localhost:5173