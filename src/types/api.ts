export interface ApiListResponse<T> {
  success: true
  count: number
  data: T[]
}

export interface ApiSingleResponse<T> {
  success: true
  message?: string
  data: T
}

export interface ApiMessageResponse {
  success: true
  message: string
}
