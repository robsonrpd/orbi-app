'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createAppointment } from '@/lib/actions/appointments'
import { Loader2, CalendarPlus } from 'lucide-react'

type Contact = { id: string; name: string | null; phone: string }
type Service = { id: string; name: string; duration_minutes: number; price: number }

type Props = {
  open: boolean
  onClose: () => void
  contacts: Contact[]
  services: Service[]
}

export function NovoAgendamentoModal({ open, onClose, contacts, services }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contactSearch, setContactSearch] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showContactList, setShowContactList] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const filteredContacts = contacts.filter(c =>
    (c.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
     c.phone.includes(contactSearch)) && contactSearch.length > 0
  ).slice(0, 5)

  function selectContact(c: Contact) {
    setSelectedContact(c)
    setContactSearch(c.name ?? c.phone)
    setShowContactList(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedContact) { setError('Selecione um cliente.'); return }
    setLoading(true)
    setError(null)
    const fd = new FormData(formRef.current!)
    fd.set('contact_id', selectedContact.id)
    const result = await createAppointment(fd)
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    formRef.current?.reset()
    setSelectedContact(null)
    setContactSearch('')
    onClose()
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white border-[#EAE8E1]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
            <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
              <CalendarPlus className="size-4 text-[#1A56FF]" />
            </div>
            Novo agendamento
          </DialogTitle>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2.5">
              {error}
            </div>
          )}

          {/* Busca de cliente */}
          <div className="space-y-1.5 relative">
            <Label className="text-sm font-medium text-[#2E2D29]">Cliente <span className="text-red-400">*</span></Label>
            <Input
              value={contactSearch}
              onChange={e => { setContactSearch(e.target.value); setSelectedContact(null); setShowContactList(true) }}
              onFocus={() => setShowContactList(true)}
              placeholder="Buscar por nome ou telefone..."
              className="h-10 border-[#EAE8E1] focus-visible:ring-[#1A56FF]"
            />
            {showContactList && filteredContacts.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-[#EAE8E1] rounded-lg shadow-lg overflow-hidden">
                {filteredContacts.map(c => (
                  <button key={c.id} type="button"
                    onClick={() => selectContact(c)}
                    className="w-full text-left px-3 py-2.5 hover:bg-[#F7F6F3] transition-colors border-b border-[#EAE8E1] last:border-0">
                    <p className="text-sm font-medium text-[#1C1B18]">{c.name ?? 'Sem nome'}</p>
                    <p className="text-xs text-[#8C8880]">{c.phone}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Serviço */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#2E2D29]">Serviço</Label>
            <select name="service_id"
              className="w-full h-10 rounded-md border border-[#EAE8E1] px-3 text-sm text-[#2E2D29] bg-white focus:outline-none focus:ring-2 focus:ring-[#1A56FF]">
              <option value="">Selecionar serviço...</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.duration_minutes}min — R$ {Number(s.price).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {/* Data e hora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[#2E2D29]">Data <span className="text-red-400">*</span></Label>
              <Input type="date" name="date" min={today} required
                className="h-10 border-[#EAE8E1] focus-visible:ring-[#1A56FF]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[#2E2D29]">Horário <span className="text-red-400">*</span></Label>
              <Input type="time" name="time" required
                className="h-10 border-[#EAE8E1] focus-visible:ring-[#1A56FF]" />
            </div>
          </div>

          {/* Profissional */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#2E2D29]">Profissional</Label>
            <Input name="professional" placeholder="Nome do profissional (opcional)"
              className="h-10 border-[#EAE8E1] focus-visible:ring-[#1A56FF]" />
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#2E2D29]">Observações</Label>
            <textarea name="notes" rows={2} placeholder="Informações adicionais..."
              className="w-full resize-none rounded-md border border-[#EAE8E1] px-3 py-2 text-sm text-[#2E2D29] placeholder:text-[#C8C5BB] focus:outline-none focus:ring-2 focus:ring-[#1A56FF]" />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}
              className="border-[#EAE8E1] text-[#8C8880] hover:text-[#2E2D29]">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}
              className="bg-[#1A56FF] hover:bg-[#1445DD] text-white gap-2">
              {loading ? <Loader2 className="size-4 animate-spin" /> : 'Criar agendamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
