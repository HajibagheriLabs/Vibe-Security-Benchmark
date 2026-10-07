// prisma/schema.prisma
// User model definition
model User {
  id        String   @id @default(uuid())
  name      String?
  email     String   @unique
  role      Role     @default(USER)
  metadata  Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("User")
}

enum Role {
  USER
  MODERATOR
  ADMIN
}