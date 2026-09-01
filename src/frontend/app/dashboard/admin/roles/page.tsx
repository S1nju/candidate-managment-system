"use client"

import React, { useState } from "react"
import { useLanguage } from "@/context/language-context"
import { Shield, Plus, Trash2, Loader2, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import useSWR, { mutate } from "swr"
import axios from "@/lib/axios"
import { Badge } from "@/components/ui/badge"

interface Role {
    id: number
    name: string
    guard_name: string
    created_at: string
    users_count?: number
    permissions?: any[]
}

export default function RolesPage() {
    const { t } = useLanguage()
    const { toast } = useToast()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [newRoleName, setNewRoleName] = useState("")
    const [creating, setCreating] = useState(false)

    const { data: roles, error, isLoading } = useSWR<Role[]>('/api/admin/roles',
        url => axios.get(url).then(res => res.data)
    )

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newRoleName.trim()) return

        setCreating(true)
        try {
            await axios.post('/api/admin/roles', { name: newRoleName })
            mutate('/api/admin/roles')
            setIsDialogOpen(false)
            setNewRoleName("")
            toast({ title: "Role created successfully" })
        } catch (error: any) {
            toast({
                title: "Failed to create role",
                description: error.response?.data?.message || "Something went wrong",
                variant: "destructive"
            })
        } finally {
            setCreating(false)
        }
    }

    const handleDeleteRole = async (role: Role) => {
        if (!confirm(`Are you sure you want to delete role "${role.name}"? This cannot be undone.`)) return

        try {
            await axios.delete(`/api/admin/roles/${role.id}`)
            mutate('/api/admin/roles')
            toast({ title: "Role deleted successfully" })
        } catch (error: any) {
            toast({
                title: "Failed to delete role",
                description: error.response?.data?.message || "Something went wrong",
                variant: "destructive"
            })
        }
    }

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>

    const systemRoles = ['admin', 'worker']

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Roles Management</h2>
                    <p className="text-muted-foreground">Manage roles and permissions for your organization members.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Role
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Role</DialogTitle>
                            <DialogDescription>Add a new role to categorize your members (e.g., "Company A", "HR Manager").</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateRole} className="space-y-4">
                            <Input
                                placeholder="Role Name (e.g. Acme Corp)"
                                value={newRoleName}
                                onChange={e => setNewRoleName(e.target.value)}
                                autoFocus
                            />
                            <DialogFooter>
                                <Button type="submit" disabled={creating}>
                                    {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Role
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {roles?.map((role) => (
                    <Card key={role.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {role.name}
                            </CardTitle>
                            <Shield className={`h-4 w-4 ${systemRoles.includes(role.name) ? 'text-primary' : 'text-muted-foreground'}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold capitalize">{role.name}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {systemRoles.includes(role.name) ? 'System Role' : 'Custom Role'}
                            </p>

                            <div className="mt-4 flex items-center justify-between">
                                <Badge variant="secondary" className="text-xs font-normal">
                                    {role.guard_name}
                                </Badge>

                                {!systemRoles.includes(role.name) && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                        onClick={() => handleDeleteRole(role)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
