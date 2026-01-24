"use client"

import React, { useState } from "react"
import useSWR, { mutate } from "swr"
import axios from "@/lib/axios"
import { useLanguage } from "@/context/language-context"
import { useAuth } from "@/hooks/use-auth"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Shield, User as UserIcon, ShieldAlert } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

export default function SecurityPage() {
    const { user: currentUser } = useAuth({ middleware: "auth" })
    const { t } = useLanguage()
    const { toast } = useToast()

    const [editingUser, setEditingUser] = useState<any>(null)
    const [selectedRoles, setSelectedRoles] = useState<string[]>([])
    const [isUpdating, setIsUpdating] = useState(false)
    const [isCreatingUser, setIsCreatingUser] = useState(false)

    const isAdmin = currentUser?.roles?.some((r: any) => r.name === 'admin')

    const { data: usersResponse, isLoading: isLoadingUsers } = useSWR(
        isAdmin ? "/api/users" : null,
        () => axios.get("/api/users").then((res) => res.data)
    )

    const { data: roles } = useSWR(
        isAdmin ? "/api/roles" : null,
        () => axios.get("/api/roles").then((res) => res.data)
    )

    const users = usersResponse?.data || []

    const handleEdit = (user: any) => {
        setEditingUser(user)
        setSelectedRoles(user.roles.map((r: any) => r.name))
    }

    const handleUpdateRoles = async () => {
        setIsUpdating(true)
        try {
            await axios.put(`/api/users/${editingUser.id}`, {
                name: editingUser.name,
                email: editingUser.email,
                roles: selectedRoles
            })
            toast({ title: "Success", description: "User roles updated successfully" })
            mutate("/api/users")
            setEditingUser(null)
        } catch (err) {
            toast({ title: "Error", description: "Failed to update roles", variant: "destructive" })
        } finally {
            setIsUpdating(false)
        }
    }

    if (currentUser && !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
                <p className="text-muted-foreground mt-2">You do not have permission to manage users.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("sidebar.security")}</h1>
                    <p className="text-muted-foreground">
                        Manage user accounts, roles, and permissions.
                    </p>
                </div>
                <Button onClick={() => setIsCreatingUser(true)}>
                    <UserIcon className="w-4 h-4 mr-2" />
                    Create User
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="rounded-xl border shadow-sm overflow-hidden bg-card border-slate-200 dark:border-slate-800">
                    <div className="p-4 bg-muted/50 border-b font-semibold flex items-center gap-2">
                        <UserIcon className="w-4 h-4" /> User Management
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-800">
                                <TableHead>User</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Roles</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingUsers ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : users.map((u: any) => (
                                <TableRow key={u.id} className="hover:bg-muted/30 transition-colors border-slate-200 dark:border-slate-800">
                                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">{u.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {u.roles?.map((r: any) => (
                                                <Badge key={r.id} variant={r.name === 'admin' ? "destructive" : "secondary"} className="text-[10px] py-0 px-2">
                                                    {r.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(u)}>
                                            Manage
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Edit User Dialog */}
            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage User: {editingUser?.name}</DialogTitle>
                        <DialogDescription>
                            Assign or revoke roles for this user.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="font-semibold text-sm flex items-center gap-2">
                            <Shield className="w-4 h-4 text-primary" /> Roles
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {roles?.map((role: any) => (
                                <div key={role.id} className="flex items-center justify-between border p-3 rounded-lg hover:bg-muted/50 transition-colors">
                                    <label
                                        htmlFor={`role-${role.id}`}
                                        className="text-sm font-medium leading-none cursor-pointer select-none"
                                    >
                                        {role.name}
                                    </label>
                                    <Switch
                                        id={`role-${role.id}`}
                                        checked={selectedRoles.includes(role.name)}
                                        onCheckedChange={(checked: boolean) => {
                                            if (checked) {
                                                setSelectedRoles([...selectedRoles, role.name])
                                            } else {
                                                setSelectedRoles(selectedRoles.filter(r => r !== role.name))
                                            }
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg flex gap-3 border border-amber-200 dark:border-amber-800">
                            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                            <div className="text-xs text-amber-800 dark:text-amber-400">
                                <p className="font-bold mb-1">Warning:</p>
                                Changing roles will affect user permissions immediately. Removing 'admin' role from yourself may lock you out.
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
                        <Button onClick={handleUpdateRoles} disabled={isUpdating}>
                            {isUpdating ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create User Dialog */}
            <CreateUserDialog
                open={isCreatingUser}
                onOpenChange={setIsCreatingUser}
                onSuccess={() => mutate("/api/users")}
                roles={roles}
            />
        </div>
    )
}

function CreateUserDialog({ open, onOpenChange, onSuccess, roles }: any) {
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        roles: [] as string[]
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            await axios.post("/api/users", formData)
            toast({ title: "Success", description: "User created successfully" })
            setFormData({ name: "", email: "", password: "", roles: [] })
            onOpenChange(false)
            onSuccess()
        } catch (err: any) {
            toast({
                title: "Error",
                description: err?.response?.data?.message || "Failed to create user",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>Add a new user to the system (e.g. Worker)</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                        <label htmlFor="name">Name</label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <label htmlFor="email">Email</label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <label htmlFor="password">Password</label>
                        <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            required
                            minLength={8}
                        />
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Roles</label>
                        <div className="flex flex-wrap gap-2 border p-2 rounded max-h-32 overflow-y-auto">
                            {roles?.map((role: any) => (
                                <div key={role.id} className="flex items-center gap-2">
                                    <Switch
                                        id={`new-role-${role.id}`}
                                        checked={formData.roles.includes(role.name)}
                                        onCheckedChange={checked => {
                                            if (checked) setFormData(prev => ({ ...prev, roles: [...prev.roles, role.name] }))
                                            else setFormData(prev => ({ ...prev, roles: prev.roles.filter(r => r !== role.name) }))
                                        }}
                                    />
                                    <label htmlFor={`new-role-${role.id}`} className="text-sm">{role.name}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isLoading}>{isLoading ? "Creating..." : "Create User"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
