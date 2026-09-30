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
import { useLanguage } from "@/context/language-context"

export default function UsersPage() {
    const { t } = useLanguage()
    const { toast } = useToast()
    const { data: users, error, isLoading, mutate } = useSWR("/api/admin/users")
    const [resetDialogOpen, setResetDialogOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [newPassword, setNewPassword] = useState("")
    const [forceReset, setForceReset] = useState(true)
    const [resetting, setResetting] = useState(false)
    const { data: allRoles } = useSWR("/api/admin/roles")
    const [createOpen, setCreateOpen] = useState(false)
    const [creating, setCreating] = useState(false)
    const [newUser, setNewUser] = useState({ name: "", email: "", password: "", roles: [] as string[], force_password_reset: true })

    const handleCreateUser = async () => {
        setCreating(true)
        try {
            await axios.post("/api/admin/users", newUser)
            toast({ title: t("users.toasts.created") })
            setCreateOpen(false)
            setNewUser({ name: "", email: "", password: "", roles: [], force_password_reset: true })
            mutate()
        } catch (error: any) {
            const errors = error.response?.data?.errors
            const detail = errors ? Object.values(errors).flat().join(" ") : error.response?.data?.message
            toast({ title: t("users.toasts.create_failed"), description: detail, variant: "destructive" })
        } finally {
            setCreating(false)
        }
    }

    const handleResetPassword = async () => {
        if (!selectedUser || !newPassword) return
        setResetting(true)
        try {
            await axios.post(`/api/admin/users/${selectedUser.id}/reset-password`, {
                password: newPassword,
                force_reset: forceReset
            })
            toast({ title: t("users.toasts.reset_success") })
            setResetDialogOpen(false)
            setNewPassword("")
            mutate()
        } catch (error) {
            toast({ title: t("users.toasts.reset_failed"), variant: "destructive" })
        } finally {
            setResetting(false)
        }
    }

    const handleDeleteUser = async (user: any) => {
        if (!confirm(t("users.confirm_delete").replace("{name}", user.name))) return
        try {
            await axios.delete(`/api/admin/users/${user.id}`)
            toast({ title: t("users.toasts.deleted") })
            mutate()
        } catch (error) {
            toast({ title: t("users.toasts.delete_failed"), variant: "destructive" })
        }
    }

    const handleRestoreUser = async (user: any) => {
        try {
            await axios.post(`/api/admin/users/${user.id}/restore`)
            toast({ title: t("users.toasts.restored") })
            mutate()
        } catch (error) {
            toast({ title: t("users.toasts.restore_failed"), variant: "destructive" })
        }
    }

    if (isLoading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">{t("users.title")}</h1>
                    <p className="text-muted-foreground">{t("users.subtitle")}</p>
                </div>
                <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> {t("users.add_new")}
                </Button>
            </div>

            <div className="bg-card rounded-lg shadow border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("users.table.user")}</TableHead>
                            <TableHead>{t("users.table.roles")}</TableHead>
                            <TableHead>{t("users.table.status")}</TableHead>
                            <TableHead>{t("users.table.password_status")}</TableHead>
                            <TableHead className="text-right">{t("users.table.actions")}</TableHead>
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
                                            <Trash2 className="h-3 w-3" /> {t("users.status_deleted")}
                                        </Badge>
                                    ) : (
                                        <Badge variant="default" className="bg-green-600 flex items-center gap-1 w-fit hover:bg-green-700">
                                            <CheckCircle2 className="h-3 w-3" /> {t("users.status_active")}
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {user.force_password_reset ? (
                                        <div className="flex items-center gap-1.5 text-orange-600 text-xs font-medium">
                                            <ShieldAlert className="h-3.5 w-3.5" />
                                            {t("users.password_reset_required")}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                                            <ShieldCheck className="h-3.5 w-3.5" />
                                            {t("users.password_secure")}
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
                                            <DropdownMenuLabel>{t("users.actions_label")}</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => {
                                                setSelectedUser(user);
                                                setResetDialogOpen(true);
                                            }}>
                                                <Key className="mr-2 h-4 w-4" /> {t("users.reset_password")}
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            {user.deleted_at ? (
                                                <DropdownMenuItem className="text-green-600" onClick={() => handleRestoreUser(user)}>
                                                    <RotateCcw className="mr-2 h-4 w-4" /> {t("users.restore_user")}
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteUser(user)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> {t("users.delete_user")}
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

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("users.create_dialog.title")}</DialogTitle>
                        <DialogDescription>{t("users.create_dialog.description")}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-name">{t("users.create_dialog.name")}</Label>
                            <Input id="new-name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-email">{t("users.create_dialog.email")}</Label>
                            <Input id="new-email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-password">{t("users.create_dialog.password")}</Label>
                            <Input id="new-password" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("users.create_dialog.roles")}</Label>
                            <div className="flex flex-wrap gap-4">
                                {(Array.isArray(allRoles) ? allRoles : []).map((role: any) => (
                                    <div key={role.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`new-role-${role.id}`}
                                            checked={newUser.roles.includes(role.name)}
                                            onCheckedChange={(checked: any) => setNewUser({
                                                ...newUser,
                                                roles: checked ? [...newUser.roles, role.name] : newUser.roles.filter(r => r !== role.name),
                                            })}
                                        />
                                        <Label htmlFor={`new-role-${role.id}`} className="text-sm font-normal capitalize">{role.name}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="new-force-reset"
                                checked={newUser.force_password_reset}
                                onCheckedChange={(checked: any) => setNewUser({ ...newUser, force_password_reset: !!checked })}
                            />
                            <Label htmlFor="new-force-reset" className="text-sm font-normal">{t("users.create_dialog.force_reset")}</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>{t("users.create_dialog.cancel")}</Button>
                        <Button onClick={handleCreateUser} disabled={creating || !newUser.name || !newUser.email || !newUser.password}>
                            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            {t("users.create_dialog.create")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("users.dialog.title")}</DialogTitle>
                        <DialogDescription>
                            {t("users.dialog.description").replace("{name}", selectedUser?.name || "")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">{t("users.dialog.new_password")}</Label>
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
                                {t("users.dialog.force_reset")}
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResetDialogOpen(false)}>{t("users.dialog.cancel")}</Button>
                        <Button onClick={handleResetPassword} disabled={resetting || !newPassword}>
                            {resetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
                            {t("users.dialog.reset_button")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
