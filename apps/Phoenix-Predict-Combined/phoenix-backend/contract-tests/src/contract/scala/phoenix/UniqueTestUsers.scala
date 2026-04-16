package phoenix

trait UniqueTestUsers extends TestUser with AsyncSupport {

  def withUniqueTestUser(testCode: User => Any): Unit = {
    val testUser: User = randomUserWithFixedPassword()
    await(signUp(testUser))
    testCode(testUser)
  }
}
