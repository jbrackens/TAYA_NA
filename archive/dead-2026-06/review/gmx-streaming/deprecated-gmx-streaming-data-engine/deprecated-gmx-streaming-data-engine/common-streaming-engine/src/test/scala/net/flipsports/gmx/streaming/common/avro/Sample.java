package net.flipsports.gmx.streaming.common.avro;

import org.apache.avro.specific.SpecificData;
import org.apache.avro.message.BinaryMessageEncoder;
import org.apache.avro.message.BinaryMessageDecoder;
import org.apache.avro.message.SchemaStore;


public class Sample extends org.apache.avro.specific.SpecificRecordBase implements org.apache.avro.specific.SpecificRecord {
    private static final long serialVersionUID = 797159987640801212L;
    public static final org.apache.avro.Schema SCHEMA$ = new org.apache.avro.Schema.Parser().parse("" +
            "{\n" +
            "  \"type\": \"record\",\n" +
            "  \"name\": \"Sample\",\n" +
            "  \"namespace\": \"net.flipsports.gmx.streaming.common.avro\",\n" +
            "  \"fields\": [\n" +
            "    {\n" +
            "      \"name\": \"sample\",\n" +
            "      \"type\": \"string\"\n" +
            "    }\n" +
            "  ]\n" +
            "}");
    public static org.apache.avro.Schema getClassSchema() { return SCHEMA$; }

    private static SpecificData MODEL$ = new SpecificData();

    private static final BinaryMessageEncoder<Sample> ENCODER =
            new BinaryMessageEncoder<Sample>(MODEL$, SCHEMA$);

    private static final BinaryMessageDecoder<Sample> DECODER =
            new BinaryMessageDecoder<Sample>(MODEL$, SCHEMA$);

    /**
     * Return the BinaryMessageDecoder instance used by this class.
     */
    public static BinaryMessageDecoder<Sample> getDecoder() {
        return DECODER;
    }

    /**
     * Create a new BinaryMessageDecoder instance for this class that uses the specified {@link SchemaStore}.
     * @param resolver a {@link SchemaStore} used to find schemas by fingerprint
     */
    public static BinaryMessageDecoder<Sample> createDecoder(SchemaStore resolver) {
        return new BinaryMessageDecoder<Sample>(MODEL$, SCHEMA$, resolver);
    }

    /** Serializes this Sample to a ByteBuffer. */
    public java.nio.ByteBuffer toByteBuffer() throws java.io.IOException {
        return ENCODER.encode(this);
    }

    /** Deserializes a Sample from a ByteBuffer. */
    public static Sample fromByteBuffer(
            java.nio.ByteBuffer b) throws java.io.IOException {
        return DECODER.decode(b);
    }

    @Deprecated public java.lang.String sample;
    /**
     * Default constructor.  Note that this does not initialize fields
     * to their default values from the schema.  If that is desired then
     * one should use <code>newBuilder()</code>.
     */
    public Sample() {}

    /**
     * All-args constructor.
     * @param sample The new value for external_user_id
     */
    public Sample(java.lang.String name) {
        this.sample = name;
    }

    public org.apache.avro.Schema getSchema() { return SCHEMA$; }
    // Used by DatumWriter.  Applications should not call.
    public java.lang.Object get(int field$) {
        switch (field$) {
            case 0: return sample;
            default: throw new org.apache.avro.AvroRuntimeException("Bad index");
        }
    }

    // Used by DatumReader.  Applications should not call.
    @SuppressWarnings(value="unchecked")
    public void put(int field$, java.lang.Object value$) {
        switch (field$) {
            case 0: sample = value$.toString(); break;
            default: throw new org.apache.avro.AvroRuntimeException("Bad index");
        }
    }

    /**
     * Gets the value of the 'external_user_id' field.
     * @return The value of the 'external_user_id' field.
     */
    public java.lang.String getSample() {
        return sample;
    }

    /**
     * Sets the value of the 'external_user_id' field.
     * @param value the value to set.
     */
    public void setSample(java.lang.String value) {
        this.sample = value;
    }

    /**
     * Creates a new Sample RecordBuilder.
     * @return A new Sample RecordBuilder
     */
    public static net.flipsports.gmx.streaming.common.avro.Sample.Builder newBuilder() {
        return new net.flipsports.gmx.streaming.common.avro.Sample.Builder();
    }

    /**
     * Creates a new Sample RecordBuilder by copying an existing Builder.
     * @param other The existing builder to copy.
     * @return A new Sample RecordBuilder
     */
    public static net.flipsports.gmx.streaming.common.avro.Sample.Builder newBuilder(net.flipsports.gmx.streaming.common.avro.Sample.Builder other) {
        return new net.flipsports.gmx.streaming.common.avro.Sample.Builder(other);
    }

    /**
     * Creates a new Sample RecordBuilder by copying an existing Sample instance.
     * @param other The existing instance to copy.
     * @return A new Sample RecordBuilder
     */
    public static net.flipsports.gmx.streaming.common.avro.Sample.Builder newBuilder(net.flipsports.gmx.streaming.common.avro.Sample other) {
        return new net.flipsports.gmx.streaming.common.avro.Sample.Builder(other);
    }

    /**
     * RecordBuilder for Sample instances.
     */
    public static class Builder extends org.apache.avro.specific.SpecificRecordBuilderBase<Sample>
            implements org.apache.avro.data.RecordBuilder<Sample> {

        private java.lang.String sample;

        /** Creates a new Builder */
        private Builder() {
            super(SCHEMA$);
        }

        /**
         * Creates a Builder by copying an existing Builder.
         * @param other The existing Builder to copy.
         */
        private Builder(net.flipsports.gmx.streaming.common.avro.Sample.Builder other) {
            super(other);
            if (isValidValue(fields()[0], other.sample)) {
                this.sample = data().deepCopy(fields()[0].schema(), other.sample);
                fieldSetFlags()[0] = true;
            }
        }

        /**
         * Creates a Builder by copying an existing Sample instance
         * @param other The existing instance to copy.
         */
        private Builder(net.flipsports.gmx.streaming.common.avro.Sample other) {
            super(SCHEMA$);
            if (isValidValue(fields()[0], other.sample)) {
                this.sample = data().deepCopy(fields()[0].schema(), other.sample);
                fieldSetFlags()[0] = true;
            }
        }

        /**
         * Gets the value of the 'sample' field.
         * @return The value.
         */
        public java.lang.String getSample() {
            return sample;
        }

        /**
         * Sets the value of the 'sample' field.
         * @param value The value of 'sample'.
         * @return This builder.
         */
        public net.flipsports.gmx.streaming.common.avro.Sample.Builder setSample(java.lang.String value) {
            validate(fields()[0], value);
            this.sample = value;
            fieldSetFlags()[0] = true;
            return this;
        }

        /**
         * Checks whether the 'external_user_id' field has been set.
         * @return True if the 'external_user_id' field has been set, false otherwise.
         */
        public boolean hasSample() {
            return fieldSetFlags()[0];
        }


        /**
         * Clears the value of the 'external_user_id' field.
         * @return This builder.
         */
        public net.flipsports.gmx.streaming.common.avro.Sample.Builder clearSample() {
            sample = null;
            fieldSetFlags()[0] = false;
            return this;
        }

        @Override
        @SuppressWarnings("unchecked")
        public Sample build() {
            try {
                Sample record = new Sample();
                record.sample = fieldSetFlags()[0] ? this.sample : (java.lang.String) defaultValue(fields()[0]);
                return record;
            } catch (java.lang.Exception e) {
                throw new org.apache.avro.AvroRuntimeException(e);
            }
        }
    }

    @SuppressWarnings("unchecked")
    private static final org.apache.avro.io.DatumWriter<Sample>
            WRITER$ = (org.apache.avro.io.DatumWriter<Sample>)MODEL$.createDatumWriter(SCHEMA$);

    @Override public void writeExternal(java.io.ObjectOutput out)
            throws java.io.IOException {
        WRITER$.write(this, SpecificData.getEncoder(out));
    }

    @SuppressWarnings("unchecked")
    private static final org.apache.avro.io.DatumReader<Sample>
            READER$ = (org.apache.avro.io.DatumReader<Sample>)MODEL$.createDatumReader(SCHEMA$);

    @Override public void readExternal(java.io.ObjectInput in)
            throws java.io.IOException {
        READER$.read(this, SpecificData.getDecoder(in));
    }

}
