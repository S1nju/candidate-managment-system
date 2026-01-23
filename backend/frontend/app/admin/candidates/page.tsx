"use client"
import React from "react"
import useSWR from "swr"
import axios from "@/lib/axios"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function AdminCandidatesPage() {
  const { data, error, isLoading } = useSWR("/api/candidates", () => axios.get("/api/candidates").then(res => res.data))
  const candidates = data?.data || []

  return (
    <div className="max-w-5xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Candidates</h1>
      </div>

      {isLoading && <div className="text-center py-4">Loading candidates...</div>}
      {error && <div className="text-red-500 text-center py-4">Failed to load candidates</div>}

      {!isLoading && !error && (
        <Table>
          <TableCaption>A list of recent candidates and their contract status.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>{c.position}</TableCell>
                <TableCell>
                  <Badge variant={c.signature_id ? "default" : "secondary"}>
                    {c.signature_id ? "Signed" : "Pending"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/candidates/${c.id}`}>
                    <Button variant="outline" size="sm">View</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {candidates.length === 0 && !isLoading && <div className="mt-4 text-center text-muted-foreground">No candidates found.</div>}
    </div>
  )
}
