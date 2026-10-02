import { truncate } from '@/lib/format'
import type { LogDetails } from '@/types'
import { SHEET_W } from '../../constants'
import { FormField, TextLines } from './SvgText'

/** Shipping documents block and the printed instruction under the remarks. */
export function ShippingSection({ details }: { details: LogDetails }) {
  return (
    <g>
      <TextLines x={55} y={634} lines={['Shipping', 'Documents:']} size={12} lineHeight={13} weight={700} />
      <FormField x1={55} x2={300} y={680} value={truncate(details.manifest_number, 26)} />
      <TextLines x={55} y={693} lines={['DVL or Manifest No.', 'or']} size={10.5} />
      <FormField x1={55} x2={340} y={725} size={12} value={truncate(`${details.shipper} · ${details.commodity}`, 40)} />
      <TextLines x={55} y={738} lines={['Shipper & Commodity']} size={10.5} />

      <TextLines
        x={SHEET_W / 2 + 40}
        y={762}
        lines={[
          'Enter name of place you reported and where released from work and when and where each change of duty occurred.',
          'Use time standard of home terminal.',
        ]}
        size={11}
        lineHeight={15}
        anchor="middle"
        weight={600}
      />
    </g>
  )
}
