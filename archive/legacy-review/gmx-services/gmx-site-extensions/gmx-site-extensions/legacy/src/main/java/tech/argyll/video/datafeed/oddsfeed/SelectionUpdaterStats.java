package tech.argyll.video.datafeed.oddsfeed;

import java.util.concurrent.ConcurrentLinkedQueue;

public class SelectionUpdaterStats<T> {
  private final ConcurrentLinkedQueue<T> invalid;
  private final ConcurrentLinkedQueue<T> notFound;
  private final ConcurrentLinkedQueue<T> unchanged;
  private final ConcurrentLinkedQueue<T> updated;

  public SelectionUpdaterStats() {
    invalid = new ConcurrentLinkedQueue<>();
    notFound = new ConcurrentLinkedQueue<>();
    unchanged = new ConcurrentLinkedQueue<>();
    updated = new ConcurrentLinkedQueue<>();
  }

  public void addInvalidLine(T lineID) {
    invalid.add(lineID);
  }

  public int getInvalidCount() {
    return invalid.size();
  }

  public void addNotFoundLine(T lineID) {
    notFound.add(lineID);
  }

  public int getNotFoundCount() {
    return notFound.size();
  }

  public void addUnchangedLine(T lineID) {
    unchanged.add(lineID);
  }

  public int getUnchangedCount() {
    return unchanged.size();
  }

  public void addUpdatedLine(T lineID) {
    updated.add(lineID);
  }

  public int getUpdatedCount() {
    return updated.size();
  }

  @Override
  public String toString() {
    return String.format(
        "SelectionUpdaterStats [invalid = %s; notFound = %s; unchanged = %s; updated = %s]",
        getInvalidCount(), getNotFoundCount(), getUnchangedCount(), getUpdatedCount());
  }
}
