export type UserRole = 'user' | 'admin'

export interface User {
  id: number
  full_name: string
  email: string
  role: UserRole
  created_at: string
}

export type ItemCategory = 
  | 'electronics' 
  | 'bags' 
  | 'wallets' 
  | 'id_cards' 
  | 'keys' 
  | 'books' 
  | 'clothing' 
  | 'accessories' 
  | 'documents' 
  | 'other'

export type ItemStatus = 
  | 'lost' 
  | 'found' 
  | 'potential_match' 
  | 'claim_pending' 
  | 'verified' 
  | 'returned' 
  | 'closed'

export interface BaseItem {
  id: number
  user_id: number
  title: string
  category: ItemCategory
  description: string
  identifying_features: string | null
  image_url: string | null
  location: string
  latitude: number | null
  longitude: number | null
  status: ItemStatus
  created_at: string
}

export interface LostItem extends BaseItem {
  lost_date: string
  lost_time: string | null
}

export interface FoundItem extends BaseItem {
  found_date: string
  found_time: string | null
}

export type MatchStatus = 'pending' | 'confirmed' | 'rejected'

export interface Match {
  id: number
  lost_item_id: number
  found_item_id: number
  image_score: number
  text_score: number
  location_score: number
  time_score: number
  final_score: number
  status: MatchStatus
  created_at: string
  lost_item?: LostItem
  found_item?: FoundItem
}

export type ClaimStatus = 'pending' | 'verified' | 'rejected'

export interface Claim {
  id: number
  match_id: number
  claimant_id: number
  verification_question: string
  verification_answer: string | null
  status: ClaimStatus
  created_at: string
  match?: Match
  claimant?: User
}

export type NotificationType = 
  | 'match_found' 
  | 'claim_submitted' 
  | 'claim_approved' 
  | 'claim_rejected' 
  | 'item_returned'

export interface Notification {
  id: number
  user_id: number
  type: NotificationType
  message: string
  is_read: boolean
  created_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  full_name: string
  email: string
  password: string
}

export interface LostItemFormData {
  title: string
  category: ItemCategory
  description: string
  identifying_features: string
  image: File | null
  location: string
  latitude: number | null
  longitude: number | null
  lost_date: string
  lost_time: string
}

export interface FoundItemFormData {
  title: string
  category: ItemCategory
  description: string
  identifying_features: string
  image: File | null
  location: string
  latitude: number | null
  longitude: number | null
  found_date: string
  found_time: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface MatchScoreBreakdown {
  image: number
  text: number
  location: number
  time: number
  overall: number
}

export interface MatchExplanation {
  same_category: boolean
  visually_similar: boolean
  nearby_location: boolean
  close_date: boolean
}