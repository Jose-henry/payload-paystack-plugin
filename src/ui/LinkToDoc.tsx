'use client'

import type { UIFieldClientComponent } from 'payload'
import { CopyToClipboard, useFormFields } from '@payloadcms/ui'
import React from 'react'

export const LinkToDoc: UIFieldClientComponent = (props) => {
  const {
    field: { admin: { custom = {} } = {} },
  } = props
  const { isTestKey, nameOfIDField, paystackResourceType } = custom

  const field = useFormFields(([fields]) => fields?.[nameOfIDField] || null)
  const { value: paystackID } = field || {}

  const dashboardURL = `https://dashboard.paystack.com/${paystackResourceType}/${paystackID}`

  if (!paystackID) return null

  return (
    <div>
      <div>
        <span style={{ color: '#9A9A9A' }}>View in Paystack</span>
        <CopyToClipboard value={dashboardURL} />
      </div>
      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <a href={dashboardURL} target="_blank" rel="noreferrer noopener">
          {dashboardURL}
        </a>
      </div>
    </div>
  )
}
