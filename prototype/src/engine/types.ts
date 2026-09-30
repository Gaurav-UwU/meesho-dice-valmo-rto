export type HubId = 'powai' | 'whitefield' | 'lucknow' | 'gaya'
export type Payment = 'COD' | 'PREPAID'
export type AddressQuality = 'clear' | 'unclear' | 'new'
export type Arm = 'bonus' | 'control'

export interface Hub {
  readonly id: HubId
  readonly name: string
  readonly state: string
  readonly tier: 'metro' | 'tier2' | 'small'
  readonly lat: number
  readonly lng: number
  /** Multiplies the network RTO baseline for this hub. Illustrative, from the Shipway city spread (grade C in sources). */
  readonly cityFactor: number
}

/** A synthetic order. Nothing here is real customer data. */
export interface Order {
  readonly id: string
  readonly awb: string
  readonly hubId: HubId
  readonly pincode: string
  readonly lat: number
  readonly lng: number
  readonly distanceKm: number
  readonly payment: Payment
  readonly value: number
  readonly addressQuality: AddressQuality
  readonly phoneReachable: boolean
  readonly pastFailedAttempts: number
  /** Stand-in for Meesho's TrustMesh risk score, 0 to 1. The real one plugs in here. */
  readonly trustmesh: number
  readonly sellerState: string
  readonly sellerGst: boolean
}

export interface Rider {
  readonly id: string
  readonly name: string
  readonly hubId: HubId
  readonly arm: Arm
  /** Riders are paired (1 and 2, 3 and 4, ...); a coin decides which one of the pair gets the bonus. The verdict compares each rider with their partner. */
  readonly pairId: string
}

export interface GeoPoint {
  readonly pincode: string
  readonly lat: number
  readonly lng: number
  readonly distanceKm: number
  readonly weight: number
}

export interface HubGeo {
  readonly hub: Hub
  readonly points: readonly GeoPoint[]
}
