# LostMatch - AI-Powered Multimodal Lost & Found Retrieval System

A modern web platform where users report lost/found items and the system automatically retrieves and ranks possible matches using:
- Image similarity (CLIP embeddings)
- Semantic text similarity (Sentence Transformers)
- Location proximity
- Date/time similarity
- Category matching

## Tech Stack

### Frontend
- Next.js 15 + TypeScript + Tailwind CSS
- Three.js / React Three Fiber for 3D visualizations
- Framer Motion for animations
- shadcn/ui components
- Lucide Icons

### Backend
- FastAPI + Python 3.11+
- SQLAlchemy + PostgreSQL
- Alembic for migrations
- JWT authentication

### AI / Information Retrieval
- Sentence Transformers (all-MiniLM-L6-v2) for text embeddings
- CLIP for image embeddings
- FAISS for vector similarity search
- Custom weighted ranking pipeline

## Prerequisites

- Node.js 18+
- npm 9+
- Python 3.11+
- PostgreSQL 14+ (running locally)
- Git

## Project Structure

```
LostMatch/
├── frontend/                 # Next.js frontend
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   │   ├── 3d/         # Three.js components
│   │   │   └── ui/         # shadcn/ui components
│   │   ├── lib/            # Utilities
│   │   ├── services/       # API client
│   │   └── types/          # TypeScript types
│   └── package.json
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── core/           # Configuration
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── ai/             # AI model services
│   │   ├── retrieval/      # FAISS retrieval
│   │   ├── ranking/        # Matching & ranking
│   │   └── database/       # Database session
│   ├── alembic/            # Database migrations
│   └── requirements.txt
├── storage/                  # Local image storage
│   └── images/
│       ├── lost/
│       └── found/
├── tests/                    # Test files
├── docs/                     # Documentation
├── .env.example
└── README.md
```

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd LostMatch
```

### 2. PostgreSQL Setup

Create the database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE lostmatch;

# Exit psql
\q
```

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your PostgreSQL credentials
# DATABASE_URL=postgresql://username:password@localhost:5432/lostmatch

# Run migrations
alembic upgrade head

# Start backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: http://localhost:8000
API docs at: http://localhost:8000/docs

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at: http://localhost:3000

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/lostmatch

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# App
APP_NAME=LostMatch
APP_ENV=development
DEBUG=true

# AI Models
TEXT_EMBEDDING_MODEL=all-MiniLM-L6-v2
IMAGE_EMBEDDING_MODEL=openai/clip-vit-base-patch32

# Storage
STORAGE_PATH=../storage/images

# Retrieval
FAISS_INDEX_PATH=./faiss_indexes
TOP_K_MATCHES=5

# Ranking Weights
IMAGE_WEIGHT=0.40
TEXT_WEIGHT=0.30
LOCATION_WEIGHT=0.20
TIME_WEIGHT=0.10

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user

### Lost Items
- `POST /lost-items` - Create lost item report
- `GET /lost-items` - List lost items
- `GET /lost-items/{id}` - Get lost item details

### Found Items
- `POST /found-items` - Create found item report
- `GET /found-items` - List found items
- `GET /found-items/{id}` - Get found item details

### Matches
- `GET /matches` - List matches
- `GET /matches/{id}` - Get match details

### Claims
- `POST /claims` - Create claim
- `PATCH /claims/{id}` - Update claim

### Notifications
- `GET /notifications` - List notifications
- `PATCH /notifications/{id}/read` - Mark as read

### Admin
- `GET /admin/analytics` - Get analytics

## Development Phases

### Phase 1 - Foundation ✓
- Project structure
- Next.js + FastAPI setup
- PostgreSQL + SQLAlchemy + Alembic
- Basic 3D landing page
- Health check endpoint

### Phase 2 - Authentication (Next)
- Register/Login/Logout
- JWT tokens
- Protected routes
- User profile

### Phase 3 - Lost/Found Reports
- CRUD operations
- Image upload
- Validation

### Phase 4 - UI Components
- Dashboard
- Report forms
- Item listings
- Responsive navigation

### Phase 5 - Text Embeddings
- Sentence Transformers integration
- Text embedding generation

### Phase 6 - Image Embeddings
- CLIP integration
- Image embedding generation

### Phase 7 - FAISS Retrieval
- Text & Image FAISS indexes
- Vector ID mapping
- Index rebuilding

### Phase 8 - Multimodal Ranking
- Candidate merging
- Category filtering
- Weighted ranking

### Phase 9 - Claims & Verification
- Claim creation
- Verification questions
- Status management

### Phase 10 - Notifications
- In-app notifications
- Real-time updates

### Phase 11 - Admin Dashboard
- Analytics
- Charts
- Statistics

### Phase 12 - Testing & Evaluation
- Unit tests
- IR evaluation metrics
- Performance benchmarks

## Matching Pipeline

```
New Lost/Found Report
        ↓
Preprocessing
        ↓
Text Embedding ──────→ FAISS Text Search
        ↓
Image Embedding ─────→ FAISS Image Search
        ↓
Candidate Merging
        ↓
Category Filtering
        ↓
Location Similarity
        ↓
Date/Time Similarity
        ↓
Weighted Re-ranking
        ↓
Top 5 Matches
```

### Ranking Weights (Configurable)
- Image: 40%
- Text: 30%
- Location: 20%
- Time: 10%

## Security

- Password hashing with bcrypt
- JWT authentication
- Role-based authorization (user/admin)
- Input validation with Pydantic
- File upload validation
- Secure CORS configuration
- Environment variables for secrets

## License

MIT License - see LICENSE file for details.