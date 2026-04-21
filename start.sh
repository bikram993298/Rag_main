#!/bin/bash
# Start backend + frontend dev server together

cd "$(dirname "$0")"

echo "Starting backend on http://localhost:8000 ..."
source backend/.venv/bin/activate
python -m backend.api.main &
BACKEND_PID=$!

echo "Starting frontend on http://localhost:5173 ..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "Both servers running."
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
