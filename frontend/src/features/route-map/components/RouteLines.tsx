import { Fragment } from 'react'
import { Polyline } from 'react-leaflet'
import type { RouteLeg } from '@/types'
import { ROUTE_STYLE } from '../constants'

/** Each leg on a white casing; the empty run to pickup is dotted, the loaded leg solid. */
export function RouteLines({ legs }: { legs: RouteLeg[] }) {
  return legs
    .filter((leg) => leg.geometry.length > 1)
    .map((leg) => (
      <Fragment key={`${leg.from}-${leg.to}`}>
        <Polyline positions={leg.geometry} pathOptions={ROUTE_STYLE.casing} />
        <Polyline positions={leg.geometry} pathOptions={leg.from === 'current' ? ROUTE_STYLE.deadhead : ROUTE_STYLE.loaded} />
      </Fragment>
    ))
}
