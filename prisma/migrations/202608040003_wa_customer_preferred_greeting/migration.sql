-- Store the honorific ("Mas"/"Mbak") once a customer corrects the AI, so it stays
-- consistent for that phone number instead of being re-guessed every conversation.
-- Null means "not known yet" - the AI falls back to the neutral "Kak" for those.
ALTER TABLE "WaCustomer" ADD COLUMN "preferredGreeting" TEXT;
