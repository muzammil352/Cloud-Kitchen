'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

function FeedbackForm() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')
  const kitchenId = searchParams.get('kitchen')

  const [rating, setRating] = useState<number>(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!orderId || !kitchenId) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Invalid feedback link. Order ID or Kitchen ID is missing.</p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) return

    setIsSubmitting(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          kitchen_id: kitchenId,
          rating,
          comment: comment || null,
        }),
      })
      setSubmitted(true)
    } catch (err) {
      console.error(err)
      setSubmitted(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-12 animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-medium mb-2 text-foreground">Thank You!</h1>
        <p className="text-muted-foreground">
          Your feedback is invaluable. We appreciate you taking the time to share your experience.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-xl font-medium text-foreground tracking-tight mb-2">How was your order?</h1>
        <p className="text-sm text-muted-foreground">Rate your experience. 5 stars means excellent.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`p-1 transition-colors ${
                star <= rating ? "text-[var(--warning)]" : "text-border hover:text-[var(--warning)]/50"
              }`}
            >
              <svg className="w-12 h-12" fill={star <= rating ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <label htmlFor="comment" className="text-sm font-medium text-foreground block">
            Additional Comments <span className="text-muted-foreground font-normal">(Optional)</span>
          </label>
          <Textarea
            id="comment"
            maxLength={500}
            placeholder="Tell us what you liked or what could be improved..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="min-h-32 text-base resize-none"
          />
        </div>

        <Button 
          type="submit" 
          className="w-full h-12 text-base font-medium" 
          disabled={rating === 0 || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </form>
    </>
  )
}

export default function FeedbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-[480px] bg-background border border-border p-8 rounded-xl shadow-sm">
        <Suspense fallback={
          <div className="text-center py-12 text-muted-foreground">
            Loading form...
          </div>
        }>
          <FeedbackForm />
        </Suspense>
      </div>
    </div>
  )
}
