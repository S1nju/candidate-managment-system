"use client"

import { useRef, useState } from "react"
import SignatureCanvas from "react-signature-canvas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SignaturePadProps {
    onSignatureCreate: (type: "drawn" | "typed", value: string) => void
    width?: number
    height?: number
}

export function SignaturePad({ onSignatureCreate, width = 300, height = 100 }: SignaturePadProps) {
    const canvasRef = useRef<SignatureCanvas>(null)
    const [typedName, setTypedName] = useState("")
    const [typedInitials, setTypedInitials] = useState("")

    const handleClear = () => {
        canvasRef.current?.clear()
    }

    const handleSaveDrawn = () => {
        if (canvasRef.current?.isEmpty()) {
            alert("Please draw your signature first")
            return
        }
        const dataUrl = canvasRef.current?.toDataURL()
        if (dataUrl) {
            onSignatureCreate("drawn", dataUrl)
        }
    }

    const handleSaveTyped = (text: string) => {
        if (!text.trim()) {
            alert("Please enter your name or initials")
            return
        }
        onSignatureCreate("typed", text)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create Signature</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="draw">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="draw">Draw</TabsTrigger>
                        <TabsTrigger value="type">Type Name</TabsTrigger>
                        <TabsTrigger value="initials">Initials</TabsTrigger>
                    </TabsList>

                    <TabsContent value="draw" className="space-y-4">
                        <div
                            className="border rounded-lg bg-white flex items-center justify-center"
                            style={{ width, height }}
                        >
                            <SignatureCanvas
                                ref={canvasRef}
                                canvasProps={{
                                    width,
                                    height,
                                    className: "cursor-crosshair",
                                    style: { width: `${width}px`, height: `${height}px`, display: "block" },
                                }}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleClear} className="flex-1">
                                Clear
                            </Button>
                            <Button onClick={handleSaveDrawn} className="flex-1">
                                Save Signature
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="type" className="space-y-4">
                        <div>
                            <Label htmlFor="typed-name">Your Full Name</Label>
                            <Input
                                id="typed-name"
                                value={typedName}
                                onChange={(e) => setTypedName(e.target.value)}
                                placeholder="John Doe"
                                className="text-2xl font-signature"
                                style={{ fontFamily: "cursive" }}
                            />
                        </div>
                        <Button onClick={() => handleSaveTyped(typedName)} className="w-full">
                            Save Signature
                        </Button>
                    </TabsContent>

                    <TabsContent value="initials" className="space-y-4">
                        <div>
                            <Label htmlFor="typed-initials">Your Initials</Label>
                            <Input
                                id="typed-initials"
                                value={typedInitials}
                                onChange={(e) => setTypedInitials(e.target.value)}
                                placeholder="JD"
                                className="text-2xl font-signature"
                                style={{ fontFamily: "cursive" }}
                                maxLength={3}
                            />
                        </div>
                        <Button onClick={() => handleSaveTyped(typedInitials)} className="w-full">
                            Save Initials
                        </Button>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
