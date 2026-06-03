'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createContact } from '@/lib/actions/contacts'
import { Loader2, UserPlus, X } from 'lucide-react'

type Props = { open: boolean; onClose: () => void }

export function NovoClienteModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  function addTag(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const t = tagInput.trim()
      if (t && !tags.includes(t)) setTags(prev => [...prev, t])
      setTagInput('')
    }
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(formRef.current!)
    fd.set('tags', tags.join(','))
    const result = await createContact(fd)
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    formRef.current?.reset()
    setTags([])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white border-[#EAE8E1]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1C1B18]" style={{ fontFamily: 'Fraunces, serif' }}>
            <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
              <UserPlus className="size-4 text-[#1A56FF]" />
            </div>
            Novo cliente
          </DialogTitle>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2.5">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[#2E2D29]">Nome</Label>
              <Input name="name" placeholder="Maria Silva"
                className="h-10 border-[#EAE8E1] focus-visible:ring-[#1A56FF]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[#2E2D29]">Telefone <span className="text-red-400">*</span></Label>
              <Input name="phone" placeholder="85 99999-9999" required
                className="h-10 border-[#EAE8E1] focus-visible:ring-[#1A56FF]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#2E2D29]">Tags</Label>
            <div className="min-h-10 flex flex-wrap gap-1.5 items-center px-3 py-2 border border-[#EAE8E1] rounded-md focus-within:ring-2 focus-within:ring-[#1A56FF] bg-white">
              {tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EEF2FF] rounded-full text-xs text-[#1A56FF] border border-[#1A56FF]/20">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}>
                    <X className="size-2.5" />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={addTag}
                placeholder={tags.length === 0 ? 'VIP, novo, indicação... (Enter para adicionar)' : ''}
                className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-[#C8C5BB]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#2E2D29]">Observações</Label>
            <textarea name="notes" rows={3} placeholder="Preferências, informações importantes..."
              className="w-full resize-none rounded-md border border-[#EAE8E1] px-3 py-2 text-sm text-[#2E2D29] placeholder:text-[#C8C5BB] focus:outline-none focus:ring-2 focus:ring-[#1A56FF]" />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}
              className="border-[#EAE8E1] text-[#8C8880] hover:text-[#2E2D29]">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}
              className="bg-[#1A56FF] hover:bg-[#1445DD] text-white gap-2">
              {loading ? <Loader2 className="size-4 animate-spin" /> : 'Cadastrar cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
