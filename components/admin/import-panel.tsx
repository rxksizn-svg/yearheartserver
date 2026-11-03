'use client'

import * as React from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { CheckCircle2, AlertCircle, Loader2, Upload, Plus } from 'lucide-react'

import { importRoyaltyCsv, addRoyaltyItem } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

type ActionState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  imported?: number
}

const initial: ActionState = { status: 'idle' }

export type ArtistOption = { id: string; label: string }

function StatusBanner({ state }: { state: ActionState }) {
  if (state.status === 'idle' || !state.message) return null
  return (
    <div
      role="status"
      className={
        state.status === 'success'
          ? 'border-success/30 bg-success/10 text-success flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm'
          : 'border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm'
      }
    >
      {state.status === 'success' ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
      )}
      <span>{state.message}</span>
    </div>
  )
}

function ArtistSelect({ artists }: { artists: ArtistOption[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="userId">ผูกกับศิลปิน / ค่ายเพลง</Label>
      <select
        id="userId"
        name="userId"
        required
        defaultValue=""
        className="border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1"
      >
        <option value="" disabled>
          เลือกบัญชีผู้รับรายได้
        </option>
        {artists.map((a) => (
          <option key={a.id} value={a.id}>
            {a.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function SubmitButton({ label, icon: Icon }: { label: string; icon: typeof Upload }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Icon />}
      {label}
    </Button>
  )
}

export function ImportPanel({ artists }: { artists: ArtistOption[] }) {
  const [csvState, csvAction] = useActionState(importRoyaltyCsv, initial)
  const [manualState, manualAction] = useActionState(addRoyaltyItem, initial)

  return (
    <Tabs defaultValue="csv">
      <TabsList>
        <TabsTrigger value="csv">นำเข้า CSV</TabsTrigger>
        <TabsTrigger value="manual">เพิ่มทีละรายการ</TabsTrigger>
      </TabsList>

      <TabsContent value="csv">
        <form action={csvAction} className="flex flex-col gap-4">
          <StatusBanner state={csvState} />
          <ArtistSelect artists={artists} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="csv">ข้อมูล CSV</Label>
            <Textarea
              id="csv"
              name="csv"
              rows={8}
              required
              className="font-mono text-xs"
              placeholder={
                'dsp,isrc,ชื่อเพลง,ประเภทรายได้,ยอดสตรีม,รายได้บาท,งวด\nSpotify,THA012400001,Golden Hour,Stream Revenue,184203,64821.45,2025-06'
              }
            />
            <p className="text-muted-foreground text-xs">
              คอลัมน์: dsp, isrc, ชื่อเพลง, ประเภทรายได้, ยอดสตรีม, รายได้ (บาท),
              งวด (YYYY-MM) — รองรับแถวหัวตารางอัตโนมัติ
            </p>
          </div>
          <div className="flex justify-end">
            <SubmitButton label="นำเข้าข้อมูล" icon={Upload} />
          </div>
        </form>
      </TabsContent>

      <TabsContent value="manual">
        <form action={manualAction} className="flex flex-col gap-4">
          <StatusBanner state={manualState} />
          <ArtistSelect artists={artists} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dsp">แพลตฟอร์ม (DSP)</Label>
              <Input id="dsp" name="dsp" placeholder="Spotify" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="isrc">ISRC</Label>
              <Input id="isrc" name="isrc" placeholder="THA012400001" required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="catalogueTitle">ชื่อเพลง</Label>
            <Input
              id="catalogueTitle"
              name="catalogueTitle"
              placeholder="Golden Hour"
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="revenueType">ประเภทรายได้</Label>
              <Input
                id="revenueType"
                name="revenueType"
                placeholder="Stream Revenue"
                defaultValue="Stream Revenue"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="period">งวด (YYYY-MM)</Label>
              <Input id="period" name="period" placeholder="2025-06" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sales">ยอดสตรีม</Label>
              <Input
                id="sales"
                name="sales"
                type="number"
                min="0"
                placeholder="184203"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="revenue">รายได้ (บาท)</Label>
              <Input
                id="revenue"
                name="revenue"
                type="number"
                min="0"
                step="0.01"
                placeholder="64821.45"
                required
              />
            </div>
          </div>
          <div className="flex justify-end">
            <SubmitButton label="เพิ่มรายการ" icon={Plus} />
          </div>
        </form>
      </TabsContent>
    </Tabs>
  )
}
