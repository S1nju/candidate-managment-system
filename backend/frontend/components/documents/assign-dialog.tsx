import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import useSWR from "swr"
import axios from "@/lib/axios"

interface AssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: number | null
  onAssigned?: () => void
}

export function AssignDialog({ open, onOpenChange, documentId, onAssigned }: AssignDialogProps) {
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const { data: users } = useSWR(open ? "/api/users" : null, () => axios.get("/api/users").then(res => res.data.data))

  const handleAssign = async () => {
    if (!selectedUser || !documentId) return
    setLoading(true)
    await axios.post(`/api/documents/${documentId}/assign`, { user_id: selectedUser })
    setLoading(false)
    onOpenChange(false)
    setSelectedUser("")
    onAssigned?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select user to assign" />
            </SelectTrigger>
            <SelectContent>
              {users?.map((user: any) => (
                <SelectItem key={user.id} value={String(user.id)}>{user.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button onClick={handleAssign} disabled={!selectedUser || loading}>
            {loading ? "Assigning..." : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
