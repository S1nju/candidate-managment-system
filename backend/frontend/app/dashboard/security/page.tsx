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
import { Label } from "@/components/ui/label"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
    MoreHorizontal,
    Key,
    Trash2,
    RotateCcw,
    ShieldCheck,
    CheckCircle2,
    XCircle,
    Plus,
    Loader2
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

export default function SecurityPage() {
    const { user: currentUser } = useAuth({ middleware: "auth" })
    const { t } = useLanguage()
    const { toast } = useToast()

    const [editingUser, setEditingUser] = useState<any>(null)
    const [selectedRoles, setSelectedRoles] = useState<string[]>([])
    const [isUpdating, setIsUpdating] = useState(false)
    const [isCreatingUser, setIsCreatingUser] = useState(false)

    // Reset Password States
    const [resetDialogOpen, setResetDialogOpen] = useState(false)
    const [userToReset, setUserToReset] = useState<any>(null)
    const [newPassword, setNewPassword] = useState("")
    const [forceReset, setForceReset] = useState(true)
    const [isResetting, setIsResetting] = useState(false)

    const isAdmin = currentUser?.roles?.some((r: any) => r.name === 'admin')

    const { data: usersResponse, isLoading: isLoadingUsers, mutate: mutateUsers } = useSWR(
        isAdmin ? "/api/admin/users" : null,
        () => axios.get("/api/admin/users").then((res) => res.data)
    )

    const { data: roles } = useSWR(
        isAdmin ? "/api/admin/roles" : null,
        () => axios.get("/api/admin/roles").then((res) => res.data)
    )

    const users = usersResponse || []

    const handleEdit = (user: any) => {
        setEditingUser({ ...user })
        setSelectedRoles(user.roles.map((r: any) => r.name))
    }

    const handleUpdateUser = async () => {
        setIsUpdating(true)
        try {
            await axios.put(`/api/admin/users/${editingUser.id}`, {
                name: editingUser.name,
                email: editingUser.email,
                roles: selectedRoles
            })
            toast({ title: "Success", description: "User updated successfully" })
            mutateUsers()
            setEditingUser(null)
        } catch (err) {
            toast({ title: "Error", description: "Failed to update user", variant: "destructive" })
        } finally {
            setIsUpdating(false)
        }
    }

    const handleDeleteUser = async (user: any) => {
        if (!confirm(`Are you sure you want to delete ${user.name}?`)) return
        try {
            await axios.delete(`/api/admin/users/${user.id}`)
            toast({ title: "User deleted (soft delete)" })
            mutateUsers()
        } catch (error) {
            toast({ title: "Deletion failed", variant: "destructive" })
        }
    }

    const handleRestoreUser = async (user: any) => {
        try {
            await axios.post(`/api/admin/users/${user.id}/restore`)
            toast({ title: "User restored" })
            mutateUsers()
        } catch (error) {
            toast({ title: "Restoration failed", variant: "destructive" })
        }
    }

    const handleResetPassword = async () => {
        if (!userToReset || !newPassword) return
        setIsResetting(true)
        try {
            await axios.post(`/api/admin/users/${userToReset.id}/reset-password`, {
                password: newPassword,
                force_reset: forceReset
            })
            toast({ title: "Password reset successful" })
            setResetDialogOpen(false)
            setNewPassword("")
            mutateUsers()
        } catch (error) {
            toast({ title: "Failed to reset password", variant: "destructive" })
        } finally {
            setIsResetting(false)
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
                            ) : (
                                users.map((u: any) => (
                                    <TableRow key={u.id} className={`${u.deleted_at ? "bg-slate-50 opacity-60" : ""} hover:bg-muted/30 transition-colors border-slate-200 dark:border-slate-800`}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="font-medium text-slate-900 dark:text-slate-100">{u.name}</div>
                                                {u.deleted_at && <Badge variant="destructive" className="text-[8px] h-3 px-1 uppercase">Deleted</Badge>}
                                            </div>
                                        </TableCell>
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
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleEdit(u)}>
                                                        <UserIcon className="mr-2 h-4 w-4" /> View / Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => {
                                                        setUserToReset(u);
                                                        setResetDialogOpen(true);
                                                    }}>
                                                        <Key className="mr-2 h-4 w-4" /> Reset Password
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {u.deleted_at ? (
                                                        <DropdownMenuItem className="text-emerald-600" onClick={() => handleRestoreUser(u)}>
                                                            <RotateCcw className="mr-2 h-4 w-4" /> Restore User
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteUser(u)}>
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete User
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Reset Password Dialog */}
            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            Set a new password for {userToReset?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="force-reset"
                                checked={forceReset}
                                onCheckedChange={(checked: any) => setForceReset(checked)}
                            />
                            <Label htmlFor="force-reset" className="text-sm font-normal">
                                Force password reset on next login
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleResetPassword} disabled={isResetting || !newPassword}>
                            {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
                            Reset Password
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                                id="edit-name"
                                value={editingUser?.name || ""}
                                onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                value={editingUser?.email || ""}
                                onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                            />
                        </div>
                        <div className="font-semibold text-sm flex items-center gap-2 pt-2">
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
                        <Button onClick={handleUpdateUser} disabled={isUpdating}>
                            {isUpdating ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create User Dialog */}
            <CreateUserDialog
                open={isCreatingUser}
                onOpenChange={setIsCreatingUser}
                onSuccess={() => mutateUsers()}
                roles={roles}
            />
        </div >
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
            await axios.post("/api/admin/users", formData)
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
