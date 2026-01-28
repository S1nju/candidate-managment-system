"use client"

import React, { useState } from "react"
import useSWR from "swr"
import axios from "@/lib/axios"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
    UserIcon,
    MoreHorizontal,
    Key,
    Trash2,
    RotateCcw,
    ShieldCheck,
    ShieldAlert,
    Loader2,
    Plus,
    CheckCircle2,
    XCircle
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

export default function UsersPage() {
    const { toast } = useToast()
    const { data: users, error, isLoading, mutate } = useSWR("/api/admin/users")
    const [resetDialogOpen, setResetDialogOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [newPassword, setNewPassword] = useState("")
    const [forceReset, setForceReset] = useState(true)
    const [resetting, setResetting] = useState(false)

    const handleResetPassword = async () => {
        if (!selectedUser || !newPassword) return
        setResetting(true)
        try {
            await axios.post(`/api/admin/users/${selectedUser.id}/reset-password`, {
                password: newPassword,
                force_reset: forceReset
            })
            toast({ title: "Password reset successful" })
            setResetDialogOpen(false)
            setNewPassword("")
            mutate()
        } catch (error) {
            toast({ title: "Failed to reset password", variant: "destructive" })
        } finally {
            setResetting(false)
        }
    }

    const handleDeleteUser = async (user: any) => {
        if (!confirm(`Are you sure you want to delete ${user.name}?`)) return
        try {
            await axios.delete(`/api/admin/users/${user.id}`)
            toast({ title: "User deleted (soft delete)" })
            mutate()
        } catch (error) {
            toast({ title: "Deletion failed", variant: "destructive" })
        }
    }

    const handleRestoreUser = async (user: any) => {
        try {
            await axios.post(`/api/admin/users/${user.id}/restore`)
            toast({ title: "User restored" })
            mutate()
        } catch (error) {
            toast({ title: "Restoration failed", variant: "destructive" })
        }
    }

    if (isLoading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">User Management</h1>
                    <p className="text-muted-foreground">Manage system administrators and staff accounts.</p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add New User
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Roles</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Password Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users?.map((user: any) => (
                            <TableRow key={user.id} className={user.deleted_at ? "bg-slate-50 opacity-60" : ""}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 bg-slate-100 rounded-full flex items-center justify-center">
                                            <UserIcon className="h-5 w-5 text-slate-500" />
                                        </div>
                                        <div>
                                            <div className="font-medium">{user.name}</div>
                                            <div className="text-xs text-muted-foreground">{user.email}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        {(user.roles || []).map((role: any) => (
                                            <Badge key={role.id} variant="secondary" className="capitalize">
                                                {role.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {user.deleted_at ? (
                                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                            <Trash2 className="h-3 w-3" /> Deleted
                                        </Badge>
                                    ) : (
                                        <Badge variant="default" className="bg-green-600 flex items-center gap-1 w-fit hover:bg-green-700">
                                            <CheckCircle2 className="h-3 w-3" /> Active
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {user.force_password_reset ? (
                                        <div className="flex items-center gap-1.5 text-orange-600 text-xs font-medium">
                                            <ShieldAlert className="h-3.5 w-3.5" />
                                            Reset Required
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                                            <ShieldCheck className="h-3.5 w-3.5" />
                                            Secure
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => {
                                                setSelectedUser(user);
                                                setResetDialogOpen(true);
                                            }}>
                                                <Key className="mr-2 h-4 w-4" /> Reset Password
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            {user.deleted_at ? (
                                                <DropdownMenuItem className="text-green-600" onClick={() => handleRestoreUser(user)}>
                                                    <RotateCcw className="mr-2 h-4 w-4" /> Restore User
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteUser(user)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete User
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            Set a new password for {selectedUser?.name}.
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
                        <Button onClick={handleResetPassword} disabled={resetting || !newPassword}>
                            {resetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
                            Reset Password
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
